"""
Six Figure Barber Business Logic Tests
Tests the Six Figure Barber methodology integration including premium pricing, 
client tiers, revenue optimization, and business compliance scoring.
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch, AsyncMock, MagicMock
from sqlalchemy.orm import Session

from models import (
    User, Client, Service, Appointment, Payment, Organization,
    UnifiedUserRole, ServiceCategoryEnum
)
from services.client_tier_service import ClientTierService
from services.six_fb_compliance_service import SixFBComplianceService
from services.revenue_optimization_service import RevenueOptimizationService
from services.booking_service import create_booking
from tests.factories import (
    UserFactory, ClientFactory, ServiceFactory, AppointmentFactory,
    PaymentFactory, OrganizationFactory
)
from utils.timezone_utils import get_timezone_aware_now


class TestSixFigureBarberPricingStrategy:
    """Test Six Figure Barber pricing methodology"""
    
    def setup_method(self):
        """Setup test data for each test"""
        self.revenue_service = RevenueOptimizationService()
        from services.booking_service import create_booking, get_available_slots
        
    @pytest.mark.asyncio
    async def test_premium_service_pricing_thresholds(self, db: Session):
        """Test Six Figure Barber premium pricing thresholds ($60+ = premium)"""
        # Create services across pricing tiers
        basic_service = ServiceFactory(
            name="Basic Haircut",
            base_price=Decimal('35.00'),
            six_fb_tier="standard",
            category=ServiceCategoryEnum.HAIRCUT
        )
        
        standard_service = ServiceFactory(
            name="Standard Cut & Style",
            base_price=Decimal('55.00'),
            six_fb_tier="standard",
            category=ServiceCategoryEnum.STYLING
        )
        
        premium_service = ServiceFactory(
            name="Signature Experience",
            base_price=Decimal('75.00'),
            six_fb_tier="premium",
            category=ServiceCategoryEnum.PACKAGE
        )
        
        signature_service = ServiceFactory(
            name="Six Figure Signature",
            base_price=Decimal('120.00'),
            six_fb_tier="signature",
            category=ServiceCategoryEnum.PACKAGE
        )
        
        db.add_all([basic_service, standard_service, premium_service, signature_service])
        db.commit()
        
        # Test premium threshold validation
        assert self.booking_service.is_premium_service(basic_service) == False
        assert self.booking_service.is_premium_service(standard_service) == False
        assert self.booking_service.is_premium_service(premium_service) == True
        assert self.booking_service.is_premium_service(signature_service) == True
        
        # Test pricing tier classification
        pricing_analysis = self.revenue_service.analyze_pricing_strategy([
            basic_service, standard_service, premium_service, signature_service
        ])
        
        assert pricing_analysis["premium_services_count"] == 2
        assert pricing_analysis["premium_service_ratio"] == 0.5
        assert pricing_analysis["average_service_price"] == Decimal('71.25')
        assert pricing_analysis["meets_6fb_pricing_standards"] == True
        
    @pytest.mark.asyncio
    async def test_value_based_pricing_recommendations(self, db: Session):
        """Test Six Figure Barber value-based pricing suggestions"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        
        # Create underpriced service
        underpriced_service = ServiceFactory(
            name="Premium Fade",
            base_price=Decimal('40.00'),  # Below recommended premium threshold
            category=ServiceCategoryEnum.HAIRCUT,
            six_fb_tier="standard"
        )
        
        # Create client willing to pay premium prices
        premium_client = ClientFactory(
            average_ticket=Decimal('80.00'),
            total_spent=Decimal('1600.00'),
            total_visits=20,
            customer_type="vip"
        )
        
        # Analyze pricing opportunity
        pricing_recommendations = self.revenue_service.analyze_pricing_opportunity(
            service=underpriced_service,
            client=premium_client,
            barber_id=barber.id
        )
        
        # Verify Six Figure Barber pricing recommendations
        assert pricing_recommendations["current_price"] == Decimal('40.00')
        assert pricing_recommendations["recommended_price"] >= Decimal('65.00')
        assert pricing_recommendations["revenue_increase_potential"] >= Decimal('25.00')
        assert pricing_recommendations["six_fb_tier_upgrade"] == "premium"
        assert pricing_recommendations["confidence_score"] >= 0.8
        
        # Verify reasoning includes 6FB methodology
        assert "value-based pricing" in pricing_recommendations["reasoning"].lower()
        assert "client willingness to pay" in pricing_recommendations["reasoning"].lower()
        assert "six figure barber" in pricing_recommendations["reasoning"].lower()
        
    @pytest.mark.asyncio
    async def test_dynamic_pricing_based_on_demand(self, db: Session):
        """Test dynamic pricing adjustments based on demand patterns"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        service = ServiceFactory(
            name="High Demand Service",
            base_price=Decimal('60.00'),
            six_fb_tier="premium"
        )
        
        # Create high demand scenario with multiple bookings
        high_demand_date = get_timezone_aware_now().date() + timedelta(days=7)
        
        # Create multiple appointments for same service/date (high demand indicator)
        appointments = []
        for i in range(8):  # 8 appointments = high demand
            appointment = AppointmentFactory(
                barber_id=barber.id,
                service_id=service.id,
                start_time=get_timezone_aware_now() + timedelta(days=7, hours=9+i),
                status="confirmed",
                price=service.base_price
            )
            appointments.append(appointment)
            db.add(appointment)
        
        db.commit()
        
        # Analyze demand and get pricing recommendations
        demand_analysis = self.revenue_service.analyze_demand_patterns(
            service_id=service.id,
            date_range_days=30
        )
        
        # Verify high demand detection
        assert demand_analysis["demand_level"] == "high"
        assert demand_analysis["bookings_per_day"] >= 8
        assert demand_analysis["pricing_adjustment_recommended"] == True
        
        # Get dynamic pricing recommendation
        dynamic_pricing = self.revenue_service.calculate_dynamic_pricing(
            service=service,
            demand_analysis=demand_analysis
        )
        
        # Verify pricing increase for high demand
        assert dynamic_pricing["adjusted_price"] > service.base_price
        assert dynamic_pricing["price_increase_percentage"] >= 10.0
        assert dynamic_pricing["six_fb_methodology"] == "demand_based_value_pricing"
        assert "high demand" in dynamic_pricing["justification"].lower()


class TestClientTierSystem:
    """Test Six Figure Barber client tier system"""
    
    def setup_method(self):
        """Setup test data for each test"""
        self.client_tier_service = ClientTierService()
        
    @pytest.mark.asyncio
    async def test_client_tier_calculation_algorithm(self, db: Session):
        """Test accurate client tier calculation based on 6FB metrics"""
        # Test Platinum tier client (highest value)
        platinum_client = ClientFactory(
            total_spent=Decimal('2500.00'),  # High lifetime value
            total_visits=25,                 # Frequent visitor
            average_ticket=Decimal('100.00'), # High average spend
            last_visit_date=datetime.utcnow() - timedelta(days=14),  # Recent
            visit_frequency_days=21,         # Regular (every 3 weeks)
            no_show_count=0,                # Reliable
            cancellation_count=1,           # Rarely cancels
            referral_count=3,               # Brings new clients
            customer_type="vip"
        )
        db.add(platinum_client)
        
        # Test Gold tier client
        gold_client = ClientFactory(
            total_spent=Decimal('1200.00'),
            total_visits=15,
            average_ticket=Decimal('80.00'),
            last_visit_date=datetime.utcnow() - timedelta(days=21),
            visit_frequency_days=28,
            no_show_count=1,
            cancellation_count=2,
            referral_count=1,
            customer_type="returning"
        )
        db.add(gold_client)
        
        # Test Silver tier client
        silver_client = ClientFactory(
            total_spent=Decimal('400.00'),
            total_visits=8,
            average_ticket=Decimal('50.00'),
            last_visit_date=datetime.utcnow() - timedelta(days=35),
            visit_frequency_days=35,
            no_show_count=1,
            cancellation_count=1,
            referral_count=0,
            customer_type="returning"
        )
        db.add(silver_client)
        
        # Test Bronze tier client
        bronze_client = ClientFactory(
            total_spent=Decimal('150.00'),
            total_visits=3,
            average_ticket=Decimal('50.00'),
            last_visit_date=datetime.utcnow() - timedelta(days=60),
            visit_frequency_days=45,
            no_show_count=1,
            cancellation_count=0,
            referral_count=0,
            customer_type="returning"
        )
        db.add(bronze_client)
        
        # Test New client
        new_client = ClientFactory(
            total_spent=Decimal('0.00'),
            total_visits=0,
            average_ticket=Decimal('0.00'),
            last_visit_date=None,
            visit_frequency_days=0,
            no_show_count=0,
            cancellation_count=0,
            referral_count=0,
            customer_type="new"
        )
        db.add(new_client)
        
        db.commit()
        
        # Calculate tiers
        platinum_tier = self.client_tier_service.calculate_client_tier(platinum_client)
        gold_tier = self.client_tier_service.calculate_client_tier(gold_client)
        silver_tier = self.client_tier_service.calculate_client_tier(silver_client)
        bronze_tier = self.client_tier_service.calculate_client_tier(bronze_client)
        new_tier = self.client_tier_service.calculate_client_tier(new_client)
        
        # Verify tier calculations
        assert platinum_tier["tier"] == "platinum"
        assert platinum_tier["score"] >= 85
        assert platinum_tier["lifetime_value_score"] >= 90
        assert platinum_tier["loyalty_score"] >= 85
        assert platinum_tier["recency_score"] >= 80
        
        assert gold_tier["tier"] == "gold"
        assert gold_tier["score"] >= 65
        assert gold_tier["score"] < 85
        
        assert silver_tier["tier"] == "silver"
        assert silver_tier["score"] >= 45
        assert silver_tier["score"] < 65
        
        assert bronze_tier["tier"] == "bronze"
        assert bronze_tier["score"] >= 25
        assert bronze_tier["score"] < 45
        
        assert new_tier["tier"] == "new"
        assert new_tier["score"] < 25
        
    @pytest.mark.asyncio
    async def test_tier_based_service_pricing(self, db: Session):
        """Test tier-based pricing adjustments"""
        # Create service with tier-based pricing
        service = ServiceFactory(
            name="Premium Styling Package",
            base_price=Decimal('80.00'),
            tier_based_pricing={
                "platinum": {"discount": 0.15, "exclusive_access": True},
                "gold": {"discount": 0.10, "exclusive_access": True},
                "silver": {"discount": 0.05, "exclusive_access": False},
                "bronze": {"discount": 0.0, "exclusive_access": False},
                "new": {"discount": 0.0, "exclusive_access": False}
            }
        )
        
        # Create clients of different tiers
        clients = [
            ClientFactory(total_spent=Decimal('3000.00'), total_visits=30),  # Platinum
            ClientFactory(total_spent=Decimal('1500.00'), total_visits=18),  # Gold
            ClientFactory(total_spent=Decimal('500.00'), total_visits=10),   # Silver
            ClientFactory(total_spent=Decimal('200.00'), total_visits=4),    # Bronze
            ClientFactory(total_spent=Decimal('0.00'), total_visits=0)       # New
        ]
        
        for client in clients:
            db.add(client)
        db.commit()
        
        # Calculate tier-based pricing for each client
        pricing_results = []
        for client in clients:
            tier_data = self.client_tier_service.calculate_client_tier(client)
            adjusted_price = self.client_tier_service.calculate_tier_based_pricing(
                service, tier_data["tier"]
            )
            pricing_results.append({
                "tier": tier_data["tier"],
                "original_price": service.base_price,
                "adjusted_price": adjusted_price,
                "discount": service.base_price - adjusted_price
            })
        
        # Verify tier-based pricing
        assert pricing_results[0]["tier"] == "platinum"
        assert pricing_results[0]["discount"] == Decimal('12.00')  # 15% discount
        assert pricing_results[0]["adjusted_price"] == Decimal('68.00')
        
        assert pricing_results[1]["tier"] == "gold"
        assert pricing_results[1]["discount"] == Decimal('8.00')   # 10% discount
        assert pricing_results[1]["adjusted_price"] == Decimal('72.00')
        
        assert pricing_results[2]["tier"] == "silver"
        assert pricing_results[2]["discount"] == Decimal('4.00')   # 5% discount
        assert pricing_results[2]["adjusted_price"] == Decimal('76.00')
        
        assert pricing_results[3]["tier"] == "bronze"
        assert pricing_results[3]["discount"] == Decimal('0.00')   # No discount
        assert pricing_results[3]["adjusted_price"] == Decimal('80.00')
        
        assert pricing_results[4]["tier"] == "new"
        assert pricing_results[4]["discount"] == Decimal('0.00')   # No discount
        assert pricing_results[4]["adjusted_price"] == Decimal('80.00')
        
    @pytest.mark.asyncio
    async def test_tier_upgrade_recommendations(self, db: Session):
        """Test client tier upgrade recommendations"""
        # Create client on border of tier upgrade
        borderline_client = ClientFactory(
            total_spent=Decimal('780.00'),   # Just below Gold threshold (800)
            total_visits=9,                  # Just below Gold threshold (10)
            average_ticket=Decimal('86.67'),  # Good average
            last_visit_date=datetime.utcnow() - timedelta(days=25),
            customer_type="returning"
        )
        db.add(borderline_client)
        db.commit()
        
        # Analyze upgrade potential
        upgrade_analysis = self.client_tier_service.analyze_tier_upgrade_potential(
            borderline_client
        )
        
        # Verify upgrade recommendations
        assert upgrade_analysis["current_tier"] == "silver"
        assert upgrade_analysis["next_tier"] == "gold"
        assert upgrade_analysis["upgrade_probability"] >= 0.7
        assert upgrade_analysis["missing_spend"] <= Decimal('50.00')
        assert upgrade_analysis["missing_visits"] <= 2
        
        # Check upgrade strategies
        strategies = upgrade_analysis["upgrade_strategies"]
        assert "premium_service_recommendation" in strategies
        assert "loyalty_bonus_offer" in strategies
        assert "referral_incentive" in strategies
        
        # Verify specific upgrade actions
        actions = upgrade_analysis["recommended_actions"]
        assert len(actions) >= 3
        assert any("premium service" in action.lower() for action in actions)
        assert any("additional visit" in action.lower() for action in actions)


class TestRevenueOptimization:
    """Test Six Figure Barber revenue optimization"""
    
    def setup_method(self):
        """Setup test data for each test"""
        self.revenue_service = RevenueOptimizationService()
        
    @pytest.mark.asyncio
    async def test_service_mix_optimization(self, db: Session):
        """Test service portfolio optimization for maximum revenue"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        organization = OrganizationFactory()
        
        # Create diverse service portfolio
        services = [
            ServiceFactory(name="Basic Cut", base_price=Decimal('30.00'), six_fb_tier="standard"),
            ServiceFactory(name="Style Package", base_price=Decimal('65.00'), six_fb_tier="premium"),
            ServiceFactory(name="Beard Service", base_price=Decimal('40.00'), six_fb_tier="standard"),
            ServiceFactory(name="Signature Experience", base_price=Decimal('100.00'), six_fb_tier="signature"),
            ServiceFactory(name="Hair Treatment", base_price=Decimal('75.00'), six_fb_tier="premium")
        ]
        
        for service in services:
            service.organization_id = organization.id
            db.add(service)
        
        # Create appointment history showing current service mix
        appointments = []
        service_distribution = [10, 8, 6, 3, 4]  # Current booking counts per service
        
        for i, service in enumerate(services):
            for j in range(service_distribution[i]):
                appointment = AppointmentFactory(
                    barber_id=barber.id,
                    service_id=service.id,
                    organization_id=organization.id,
                    price=service.base_price,
                    status="completed",
                    start_time=get_timezone_aware_now() - timedelta(days=30-j)
                )
                appointments.append(appointment)
                db.add(appointment)
        
        db.commit()
        
        # Analyze current service mix
        service_mix_analysis = self.revenue_service.analyze_service_mix_performance(
            barber_id=barber.id,
            date_range_days=30
        )
        
        # Verify service mix analysis
        assert service_mix_analysis["total_appointments"] == 31
        assert service_mix_analysis["total_revenue"] == Decimal('1860.00')  # Sum of all appointment prices
        assert service_mix_analysis["average_ticket"] >= Decimal('55.00')
        
        # Verify service tier distribution
        tier_distribution = service_mix_analysis["tier_distribution"]
        assert tier_distribution["standard"]["count"] == 16  # Basic Cut + Beard Service
        assert tier_distribution["premium"]["count"] == 12   # Style Package + Hair Treatment
        assert tier_distribution["signature"]["count"] == 3  # Signature Experience
        
        # Get optimization recommendations
        optimization = self.revenue_service.optimize_service_mix(
            current_mix=service_mix_analysis,
            target_monthly_revenue=Decimal('3000.00')
        )
        
        # Verify optimization recommendations
        assert optimization["current_monthly_revenue"] == Decimal('1860.00')
        assert optimization["target_monthly_revenue"] == Decimal('3000.00')
        assert optimization["revenue_gap"] == Decimal('1140.00')
        
        recommendations = optimization["recommendations"]
        assert "increase_premium_services" in recommendations
        assert "promote_signature_services" in recommendations
        assert "reduce_basic_services" in recommendations
        
        # Verify specific service recommendations
        service_adjustments = optimization["service_adjustments"]
        
        # Should recommend increasing premium/signature services
        premium_adjustment = next(adj for adj in service_adjustments if adj["tier"] == "premium")
        assert premium_adjustment["recommended_increase"] >= 20  # Percentage increase
        
        signature_adjustment = next(adj for adj in service_adjustments if adj["tier"] == "signature")
        assert signature_adjustment["recommended_increase"] >= 50  # Higher percentage for signature
        
    @pytest.mark.asyncio
    async def test_upselling_opportunity_identification(self, db: Session):
        """Test identification of upselling opportunities"""
        # Create client with upselling potential
        client = ClientFactory(
            total_spent=Decimal('600.00'),
            total_visits=12,
            average_ticket=Decimal('50.00'),
            customer_type="returning"
        )
        
        # Create base service (what client usually books)
        base_service = ServiceFactory(
            name="Regular Haircut",
            category=ServiceCategoryEnum.HAIRCUT,
            base_price=Decimal('45.00'),
            six_fb_tier="standard"
        )
        
        # Create upselling target services
        upsell_services = [
            ServiceFactory(
                name="Haircut + Beard Trim",
                category=ServiceCategoryEnum.PACKAGE,
                base_price=Decimal('70.00'),
                six_fb_tier="premium"
            ),
            ServiceFactory(
                name="Premium Styling Package",
                category=ServiceCategoryEnum.STYLING,
                base_price=Decimal('85.00'),
                six_fb_tier="premium"
            ),
            ServiceFactory(
                name="Hair Treatment Add-on",
                category=ServiceCategoryEnum.HAIR_TREATMENT,
                base_price=Decimal('25.00'),
                six_fb_tier="standard"
            )
        ]
        
        db.add(client)
        db.add(base_service)
        for service in upsell_services:
            db.add(service)
        
        # Create booking history showing consistent basic service usage
        for i in range(8):
            appointment = AppointmentFactory(
                client_id=client.id,
                service_id=base_service.id,
                price=base_service.base_price,
                status="completed",
                start_time=get_timezone_aware_now() - timedelta(days=30*i)
            )
            db.add(appointment)
        
        db.commit()
        
        # Analyze upselling opportunities
        upsell_analysis = self.revenue_service.analyze_upselling_opportunities(
            client_id=client.id,
            base_service_id=base_service.id
        )
        
        # Verify upselling analysis
        assert upsell_analysis["client_tier"] == "silver"
        assert upsell_analysis["upselling_readiness"] >= 0.7
        assert upsell_analysis["average_historical_spend"] == Decimal('45.00')
        
        # Verify upselling recommendations
        opportunities = upsell_analysis["opportunities"]
        assert len(opportunities) >= 2
        
        # Check premium package recommendation
        premium_opp = next(opp for opp in opportunities if opp["service_id"] == upsell_services[0].id)
        assert premium_opp["revenue_increase"] == Decimal('25.00')  # 70 - 45
        assert premium_opp["success_probability"] >= 0.6
        assert premium_opp["six_fb_tier"] == "premium"
        
        # Verify add-on recommendations (easier to sell)
        addon_opp = next(opp for opp in opportunities if opp["service_id"] == upsell_services[2].id)
        assert addon_opp["success_probability"] >= 0.8  # Add-ons have higher success rate
        
    @pytest.mark.asyncio
    async def test_six_figure_goal_tracking(self, db: Session):
        """Test progress tracking toward six-figure annual revenue goal"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        organization = OrganizationFactory()
        
        # Create realistic appointment history for revenue tracking
        monthly_revenue_targets = [
            8500, 8800, 9200, 9500, 9800, 10200,  # Jan-Jun (growth trajectory)
            10500, 10800, 11000, 11300, 11600, 11900  # Jul-Dec (toward $100k annual)
        ]
        
        appointments = []
        current_date = datetime(2024, 1, 1)
        
        for month_index, target_revenue in enumerate(monthly_revenue_targets[:6]):  # First 6 months
            month_appointments = []
            monthly_revenue = Decimal('0.00')
            appointment_count = 0
            
            # Generate appointments to reach target revenue
            while monthly_revenue < target_revenue and appointment_count < 40:
                # Mix of service prices (realistic distribution)
                service_prices = [45, 60, 75, 90, 120]
                price = Decimal(str(service_prices[appointment_count % len(service_prices)]))
                
                appointment = AppointmentFactory(
                    barber_id=barber.id,
                    organization_id=organization.id,
                    start_time=current_date + timedelta(days=appointment_count),
                    price=price,
                    status="completed"
                )
                month_appointments.append(appointment)
                monthly_revenue += price
                appointment_count += 1
            
            appointments.extend(month_appointments)
            current_date = current_date.replace(month=current_date.month + 1)
        
        for appointment in appointments:
            db.add(appointment)
        db.commit()
        
        # Calculate six-figure progress
        progress_analysis = self.revenue_service.calculate_six_figure_progress(
            barber_id=barber.id,
            year=2024
        )
        
        # Verify progress tracking
        assert progress_analysis["annual_goal"] == Decimal('100000.00')
        assert progress_analysis["current_year_revenue"] >= Decimal('50000.00')
        assert progress_analysis["progress_percentage"] >= 50.0
        
        # Verify monthly breakdown
        monthly_breakdown = progress_analysis["monthly_breakdown"]
        assert len(monthly_breakdown) == 6  # 6 months of data
        
        # Check growth trajectory
        first_month_revenue = monthly_breakdown[0]["revenue"]
        last_month_revenue = monthly_breakdown[5]["revenue"]
        assert last_month_revenue > first_month_revenue  # Growth trajectory
        
        # Verify goal achievement projections
        projections = progress_analysis["projections"]
        assert "projected_annual_revenue" in projections
        assert "goal_achievement_probability" in projections
        assert "required_monthly_revenue" in projections
        
        # Check if on track for six-figure goal
        if projections["goal_achievement_probability"] >= 0.8:
            assert projections["status"] == "on_track"
        elif projections["goal_achievement_probability"] >= 0.6:
            assert projections["status"] == "needs_improvement"
        else:
            assert projections["status"] == "at_risk"


class TestSixFBComplianceScoring:
    """Test Six Figure Barber methodology compliance scoring"""
    
    def setup_method(self):
        """Setup test data for each test"""
        self.compliance_service = SixFBComplianceService()
        
    @pytest.mark.asyncio
    async def test_compliance_score_calculation(self, db: Session):
        """Test comprehensive compliance score calculation"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        organization = OrganizationFactory()
        
        # Create service portfolio aligned with 6FB methodology
        services = [
            ServiceFactory(
                name="Signature Cut",
                base_price=Decimal('80.00'),
                six_fb_tier="premium",
                category=ServiceCategoryEnum.HAIRCUT
            ),
            ServiceFactory(
                name="Complete Grooming Experience",
                base_price=Decimal('120.00'),
                six_fb_tier="signature",
                category=ServiceCategoryEnum.PACKAGE
            ),
            ServiceFactory(
                name="Basic Trim",
                base_price=Decimal('40.00'),
                six_fb_tier="standard",
                category=ServiceCategoryEnum.HAIRCUT
            )
        ]
        
        for service in services:
            service.organization_id = organization.id
            db.add(service)
        
        # Create client base with good tier distribution
        clients = [
            ClientFactory(total_spent=Decimal('2000.00'), total_visits=25, customer_type="vip"),    # Platinum
            ClientFactory(total_spent=Decimal('1200.00'), total_visits=15, customer_type="returning"), # Gold
            ClientFactory(total_spent=Decimal('600.00'), total_visits=8, customer_type="returning"),   # Silver
            ClientFactory(total_spent=Decimal('200.00'), total_visits=4, customer_type="returning"),   # Bronze
        ]
        
        for client in clients:
            db.add(client)
        
        # Create appointments showing 6FB methodology implementation
        appointments = []
        
        # Premium service focus (60% premium/signature services)
        premium_appointments = [
            AppointmentFactory(barber_id=barber.id, service_id=services[0].id, 
                             client_id=clients[0].id, price=services[0].base_price, status="completed"),
            AppointmentFactory(barber_id=barber.id, service_id=services[1].id, 
                             client_id=clients[0].id, price=services[1].base_price, status="completed"),
            AppointmentFactory(barber_id=barber.id, service_id=services[0].id, 
                             client_id=clients[1].id, price=services[0].base_price, status="completed"),
            AppointmentFactory(barber_id=barber.id, service_id=services[1].id, 
                             client_id=clients[1].id, price=services[1].base_price, status="completed"),
            AppointmentFactory(barber_id=barber.id, service_id=services[0].id, 
                             client_id=clients[2].id, price=services[0].base_price, status="completed"),
            AppointmentFactory(barber_id=barber.id, service_id=services[0].id, 
                             client_id=clients[2].id, price=services[0].base_price, status="completed"),
        ]
        
        # Standard services (40% to maintain accessibility)
        standard_appointments = [
            AppointmentFactory(barber_id=barber.id, service_id=services[2].id, 
                             client_id=clients[3].id, price=services[2].base_price, status="completed"),
            AppointmentFactory(barber_id=barber.id, service_id=services[2].id, 
                             client_id=clients[3].id, price=services[2].base_price, status="completed"),
            AppointmentFactory(barber_id=barber.id, service_id=services[2].id, 
                             client_id=clients[2].id, price=services[2].base_price, status="completed"),
            AppointmentFactory(barber_id=barber.id, service_id=services[2].id, 
                             client_id=clients[1].id, price=services[2].base_price, status="completed"),
        ]
        
        appointments.extend(premium_appointments)
        appointments.extend(standard_appointments)
        
        for appointment in appointments:
            db.add(appointment)
        
        db.commit()
        
        # Calculate compliance score
        compliance_score = self.compliance_service.calculate_compliance_score(barber.id)
        
        # Verify overall compliance
        assert compliance_score["overall_score"] >= 75.0  # Good compliance
        assert compliance_score["compliance_level"] in ["good", "excellent"]
        
        # Verify category scores
        categories = compliance_score["category_scores"]
        
        # Pricing Strategy (20% weight)
        pricing = categories["pricing_strategy"]
        assert pricing["score"] >= 70.0
        assert pricing["premium_service_ratio"] >= 0.5
        assert pricing["average_service_price"] >= Decimal('70.00')
        
        # Service Portfolio (15% weight)
        portfolio = categories["service_portfolio"]
        assert portfolio["score"] >= 70.0
        assert portfolio["tier_diversity"] >= 0.6
        
        # Client Relationships (20% weight) 
        relationships = categories["client_relationships"]
        assert relationships["score"] >= 70.0
        assert relationships["client_retention_rate"] >= 0.8
        
        # Business Operations (15% weight)
        operations = categories["business_operations"]
        assert operations["score"] >= 70.0
        
        # Marketing Presence (15% weight)
        marketing = categories["marketing_presence"]
        # Score may be lower if no marketing setup
        assert marketing["score"] >= 0.0
        
        # Revenue Optimization (15% weight)
        revenue = categories["revenue_optimization"]
        assert revenue["score"] >= 70.0
        assert revenue["monthly_growth_rate"] >= 0.0
        
    @pytest.mark.asyncio
    async def test_compliance_improvement_recommendations(self, db: Session):
        """Test compliance improvement recommendations"""
        # Create barber with mediocre compliance
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        
        # Create limited service portfolio (compliance issue)
        basic_service = ServiceFactory(
            name="Basic Cut Only",
            base_price=Decimal('30.00'),
            six_fb_tier="standard"
        )
        db.add(basic_service)
        
        # Create appointments with low average ticket
        for i in range(20):
            appointment = AppointmentFactory(
                barber_id=barber.id,
                service_id=basic_service.id,
                price=Decimal('30.00'),
                status="completed"
            )
            db.add(appointment)
        
        db.commit()
        
        # Get compliance analysis and recommendations
        compliance_analysis = self.compliance_service.analyze_compliance_gaps(barber.id)
        
        # Verify gap identification
        assert compliance_analysis["overall_score"] < 60.0
        assert compliance_analysis["compliance_level"] == "needs_improvement"
        
        # Check specific gaps
        gaps = compliance_analysis["identified_gaps"]
        assert "pricing_strategy" in gaps
        assert "service_portfolio" in gaps
        
        # Verify improvement recommendations
        recommendations = compliance_analysis["improvement_recommendations"]
        
        # Should recommend premium service development
        assert any("premium service" in rec.lower() for rec in recommendations["immediate_actions"])
        assert any("pricing" in rec.lower() for rec in recommendations["immediate_actions"])
        
        # Check implementation timeline
        timeline = compliance_analysis["implementation_timeline"]
        assert "week_1" in timeline
        assert "month_1" in timeline
        assert "quarter_1" in timeline
        
        # Verify ROI projections
        projections = compliance_analysis["improvement_projections"]
        assert projections["expected_score_increase"] >= 15.0
        assert projections["revenue_impact"] >= Decimal('500.00')
        
    @pytest.mark.asyncio
    async def test_methodology_adherence_tracking(self, db: Session):
        """Test tracking of Six Figure Barber methodology adherence over time"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        
        # Create service portfolio evolution over time
        services_timeline = [
            {  # Month 1: Starting with basic services
                "services": [
                    ServiceFactory(name="Basic Cut", base_price=Decimal('25.00'), six_fb_tier="standard")
                ],
                "appointments_per_service": [15]
            },
            {  # Month 2: Adding premium service
                "services": [
                    ServiceFactory(name="Basic Cut", base_price=Decimal('30.00'), six_fb_tier="standard"),
                    ServiceFactory(name="Premium Style", base_price=Decimal('65.00'), six_fb_tier="premium")
                ],
                "appointments_per_service": [12, 8]
            },
            {  # Month 3: Full 6FB portfolio
                "services": [
                    ServiceFactory(name="Basic Cut", base_price=Decimal('35.00'), six_fb_tier="standard"),
                    ServiceFactory(name="Premium Style", base_price=Decimal('70.00'), six_fb_tier="premium"),
                    ServiceFactory(name="Signature Experience", base_price=Decimal('100.00'), six_fb_tier="signature")
                ],
                "appointments_per_service": [8, 12, 6]
            }
        ]
        
        # Create historical data showing methodology implementation progress
        base_date = get_timezone_aware_now() - timedelta(days=90)
        
        for month, timeline_data in enumerate(services_timeline):
            month_start = base_date + timedelta(days=30 * month)
            
            # Add services for this month
            for service in timeline_data["services"]:
                db.add(service)
                
            db.commit()
            
            # Create appointments for this month
            for service_index, service in enumerate(timeline_data["services"]):
                appointment_count = timeline_data["appointments_per_service"][service_index]
                
                for i in range(appointment_count):
                    appointment = AppointmentFactory(
                        barber_id=barber.id,
                        service_id=service.id,
                        start_time=month_start + timedelta(days=i),
                        price=service.base_price,
                        status="completed"
                    )
                    db.add(appointment)
            
            db.commit()
        
        # Analyze methodology adherence progression
        adherence_tracking = self.compliance_service.track_methodology_adherence(
            barber_id=barber.id,
            months_back=3
        )
        
        # Verify progression tracking
        monthly_scores = adherence_tracking["monthly_scores"]
        assert len(monthly_scores) == 3
        
        # Should show improvement over time
        month1_score = monthly_scores[0]["compliance_score"]
        month2_score = monthly_scores[1]["compliance_score"]
        month3_score = monthly_scores[2]["compliance_score"]
        
        assert month2_score > month1_score  # Improvement from month 1 to 2
        assert month3_score > month2_score  # Continued improvement
        
        # Verify key metric improvements
        assert monthly_scores[2]["average_ticket"] > monthly_scores[0]["average_ticket"]
        assert monthly_scores[2]["premium_service_ratio"] > monthly_scores[0]["premium_service_ratio"]
        
        # Check adherence trajectory
        trajectory = adherence_tracking["adherence_trajectory"]
        assert trajectory["direction"] == "improving"
        assert trajectory["monthly_improvement_rate"] >= 5.0
        assert trajectory["projected_6_month_score"] >= 80.0