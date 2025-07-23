"""
Client Management Tests
Tests comprehensive client management including registration, booking patterns,
loyalty programs, VIP handling, and client lifecycle management.
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch, AsyncMock, MagicMock
from sqlalchemy.orm import Session

from models import (
    User, Client, Appointment, Payment, Service, Organization,
    UnifiedUserRole, ServiceCategoryEnum
)
from services.client_service import ClientService
from services.client_tier_service import ClientTierService
from services.analytics_service import AnalyticsService
from services.analytics_service import AnalyticsService
from tests.factories import (
    UserFactory, ClientFactory, AppointmentFactory, ServiceFactory,
    PaymentFactory, OrganizationFactory
)
from utils.timezone_utils import get_timezone_aware_now


class TestClientRegistrationAndOnboarding:
    """Test client registration and onboarding processes"""
    
    def setup_method(self):
        """Setup test data for each test"""
        self.client_service = ClientService()
        self.tier_service = ClientTierService()
        
    @pytest.mark.asyncio
    async def test_guest_to_account_conversion(self, db: Session):
        """Test conversion of guest booking to full client account"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        service = ServiceFactory()
        
        # Create guest booking first
        guest_info = {
            "first_name": "Sarah",
            "last_name": "Johnson",
            "email": "sarah.johnson@example.com",
            "phone": "+1234567890"
        }
        
        # Create appointment as guest booking
        guest_appointment = AppointmentFactory(
            user_id=None,  # No user account yet
            barber_id=barber.id,
            service_id=service.id,
            start_time=get_timezone_aware_now() - timedelta(days=1),
            status="completed",
            price=Decimal('55.00'),
            notes=f"Guest booking - {guest_info['first_name']} {guest_info['last_name']} ({guest_info['email']}, {guest_info['phone']})"
        )
        db.add(guest_appointment)
        db.commit()
        
        # Convert guest to full account
        account_creation_data = {
            "email": guest_info["email"],
            "password": "SecurePassword123!",
            "first_name": guest_info["first_name"],
            "last_name": guest_info["last_name"],
            "phone": guest_info["phone"],
            "communication_preferences": {
                "sms": True,
                "email": True,
                "marketing": True,
                "reminders": True
            },
            "guest_appointment_ids": [guest_appointment.id]
        }
        
        conversion_result = self.client_service.convert_guest_to_account(
            db=db,
            guest_data=account_creation_data
        )
        
        # Verify account creation
        assert conversion_result["success"] == True
        assert "user_id" in conversion_result
        assert "client_id" in conversion_result
        
        # Verify user account created
        user = db.query(User).filter(User.id == conversion_result["user_id"]).first()
        assert user is not None
        assert user.email == guest_info["email"]
        assert user.unified_role == UnifiedUserRole.CLIENT
        
        # Verify client profile created
        client = db.query(Client).filter(Client.id == conversion_result["client_id"]).first()
        assert client is not None
        assert client.first_name == guest_info["first_name"]
        assert client.last_name == guest_info["last_name"]
        assert client.email == guest_info["email"]
        assert client.user_id == user.id
        
        # Verify guest appointment linked to new account
        updated_appointment = db.query(Appointment).filter(Appointment.id == guest_appointment.id).first()
        assert updated_appointment.user_id == user.id
        assert updated_appointment.client_id == client.id
        
        # Verify initial metrics calculated
        assert client.total_spent == Decimal('55.00')
        assert client.total_visits == 1
        assert client.customer_type == "returning"  # No longer "new" since has appointment
        
    @pytest.mark.asyncio
    async def test_new_client_onboarding_flow(self, db: Session):
        """Test complete new client onboarding flow"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        organization = OrganizationFactory()
        
        # Create new client account (no previous bookings)
        client_data = {
            "first_name": "Michael",
            "last_name": "Chen",
            "email": "michael.chen@example.com",
            "phone": "+1987654321",
            "date_of_birth": datetime(1985, 6, 15).date(),
            "communication_preferences": {
                "sms": True,
                "email": True,
                "marketing": False,  # Opted out of marketing initially
                "reminders": True
            },
            "service_preferences": {
                "preferred_barber_id": barber.id,
                "preferred_time_slots": ["morning", "afternoon"],
                "service_interests": ["haircut", "beard_trim"]
            }
        }
        
        onboarding_result = self.client_service.complete_new_client_onboarding(
            db=db,
            client_data=client_data,
            organization_id=organization.id
        )
        
        # Verify onboarding completion
        assert onboarding_result["success"] == True
        assert "client_id" in onboarding_result
        assert "onboarding_checklist" in onboarding_result
        
        client = db.query(Client).filter(Client.id == onboarding_result["client_id"]).first()
        
        # Verify client profile
        assert client.first_name == "Michael"
        assert client.last_name == "Chen"
        assert client.customer_type == "new"
        assert client.total_visits == 0
        assert client.total_spent == Decimal('0.00')
        
        # Verify preferences stored
        assert client.communication_preferences["sms"] == True
        assert client.communication_preferences["marketing"] == False
        
        # Verify onboarding checklist
        checklist = onboarding_result["onboarding_checklist"]
        assert "profile_complete" in checklist
        assert "preferences_set" in checklist
        assert "first_booking_incentive" in checklist
        
        # Verify new client incentives offered
        assert "incentives" in onboarding_result
        incentives = onboarding_result["incentives"]
        assert "first_booking_discount" in incentives
        assert incentives["first_booking_discount"]["percentage"] >= 10
        
    @pytest.mark.asyncio
    async def test_client_profile_completion_validation(self, db: Session):
        """Test client profile completion and validation"""
        # Create client with minimal information
        incomplete_client = ClientFactory(
            first_name="John",
            last_name=None,  # Missing last name
            email="john.incomplete@example.com",
            phone=None,  # Missing phone
            date_of_birth=None,  # Missing DOB
            communication_preferences=None  # Missing preferences
        )
        db.add(incomplete_client)
        db.commit()
        
        # Check profile completion status
        completion_status = self.client_service.analyze_profile_completion(incomplete_client)
        
        # Verify completion analysis
        assert completion_status["completion_percentage"] < 70
        assert completion_status["is_complete"] == False
        
        # Check missing fields
        missing_fields = completion_status["missing_fields"]
        assert "last_name" in missing_fields
        assert "phone" in missing_fields
        assert "date_of_birth" in missing_fields
        assert "communication_preferences" in missing_fields
        
        # Update profile with missing information
        profile_updates = {
            "last_name": "Doe",
            "phone": "+1555000123",
            "date_of_birth": datetime(1990, 3, 20).date(),
            "communication_preferences": {
                "sms": True,
                "email": True,
                "marketing": True,
                "reminders": True
            }
        }
        
        update_result = self.client_service.update_client_profile(
            db=db,
            client_id=incomplete_client.id,
            updates=profile_updates
        )
        
        # Verify profile completion improvement
        assert update_result["success"] == True
        
        updated_client = db.query(Client).filter(Client.id == incomplete_client.id).first()
        updated_completion = self.client_service.analyze_profile_completion(updated_client)
        
        assert updated_completion["completion_percentage"] >= 90
        assert updated_completion["is_complete"] == True
        assert len(updated_completion["missing_fields"]) == 0


class TestClientBookingPatterns:
    """Test client booking pattern analysis and predictions"""
    
    def setup_method(self):
        """Setup test data for each test"""
        self.client_service = ClientService()
        self.analytics_service = AnalyticsService()
        
    @pytest.mark.asyncio
    async def test_regular_client_pattern_detection(self, db: Session):
        """Test detection of regular client booking patterns"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory()
        service = ServiceFactory(base_price=Decimal('60.00'))
        
        # Create regular booking pattern: every 3 weeks, same service
        base_date = get_timezone_aware_now() - timedelta(days=84)  # 12 weeks ago
        
        regular_appointments = []
        for i in range(4):  # 4 appointments over 12 weeks
            appointment_date = base_date + timedelta(weeks=3*i)
            appointment = AppointmentFactory(
                client_id=client.id,
                barber_id=barber.id,
                service_id=service.id,
                start_time=appointment_date,
                price=service.base_price,
                status="completed"
            )
            regular_appointments.append(appointment)
            db.add(appointment)
            
        db.commit()
        
        # Analyze booking patterns
        pattern_analysis = self.client_service.analyze_booking_patterns(
            db=db,
            client_id=client.id
        )
        
        # Verify pattern detection
        assert pattern_analysis["pattern_type"] == "regular"
        assert pattern_analysis["frequency_days"] >= 20  # Approximately 3 weeks
        assert pattern_analysis["frequency_days"] <= 22
        assert pattern_analysis["consistency_score"] >= 0.8  # High consistency
        
        # Verify service preferences
        service_preferences = pattern_analysis["service_preferences"]
        assert service_preferences["primary_service"] == service.name
        assert service_preferences["service_loyalty"] >= 0.9  # Always books same service
        
        # Verify appointment timing patterns
        timing_patterns = pattern_analysis["timing_patterns"]
        assert "preferred_day_of_week" in timing_patterns
        assert "preferred_time_of_day" in timing_patterns
        
        # Test next appointment prediction
        prediction = self.client_service.predict_next_appointment(
            db=db,
            client_id=client.id,
            pattern_analysis=pattern_analysis
        )
        
        # Should predict appointment in ~3 weeks from last one
        last_appointment_date = max(apt.start_time for apt in regular_appointments)
        predicted_date = prediction["predicted_date"]
        days_difference = (predicted_date.date() - last_appointment_date.date()).days
        
        assert days_difference >= 18  # Within reasonable range
        assert days_difference <= 25
        assert prediction["confidence_score"] >= 0.7
        
    @pytest.mark.asyncio
    async def test_irregular_client_pattern_detection(self, db: Session):
        """Test detection of irregular/sporadic client patterns"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory()
        services = [ServiceFactory() for _ in range(3)]
        
        # Create irregular booking pattern: various gaps and services
        irregular_appointments = [
            AppointmentFactory(
                client_id=client.id,
                barber_id=barber.id,
                service_id=services[0].id,
                start_time=get_timezone_aware_now() - timedelta(days=120),
                status="completed"
            ),
            AppointmentFactory(
                client_id=client.id,
                barber_id=barber.id,
                service_id=services[1].id,
                start_time=get_timezone_aware_now() - timedelta(days=85),
                status="completed"
            ),
            AppointmentFactory(
                client_id=client.id,
                barber_id=barber.id,
                service_id=services[2].id,
                start_time=get_timezone_aware_now() - timedelta(days=20),
                status="completed"
            )
        ]
        
        for appointment in irregular_appointments:
            db.add(appointment)
        db.commit()
        
        # Analyze irregular patterns
        pattern_analysis = self.client_service.analyze_booking_patterns(
            db=db,
            client_id=client.id
        )
        
        # Verify irregular pattern detection
        assert pattern_analysis["pattern_type"] == "irregular"
        assert pattern_analysis["consistency_score"] <= 0.5  # Low consistency
        
        # Verify service variety
        service_preferences = pattern_analysis["service_preferences"]
        assert service_preferences["service_variety"] >= 0.6  # High variety
        assert service_preferences["service_loyalty"] <= 0.5  # Low loyalty to single service
        
        # Prediction should have lower confidence
        prediction = self.client_service.predict_next_appointment(
            db=db,
            client_id=client.id,
            pattern_analysis=pattern_analysis
        )
        
        assert prediction["confidence_score"] <= 0.6  # Lower confidence
        assert "recommendation" in prediction
        assert "pattern_improvement_suggestions" in prediction
        
    @pytest.mark.asyncio
    async def test_seasonal_booking_pattern_detection(self, db: Session):
        """Test detection of seasonal booking patterns"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory()
        service = ServiceFactory()
        
        # Create seasonal pattern: more frequent bookings in certain months
        # Heavy booking in spring/summer, sparse in fall/winter
        base_year = 2023
        seasonal_appointments = []
        
        # Spring/Summer: Monthly bookings (March-August)
        for month in [3, 4, 5, 6, 7, 8]:
            appointment = AppointmentFactory(
                client_id=client.id,
                barber_id=barber.id,
                service_id=service.id,
                start_time=datetime(base_year, month, 15, 10, 0),
                status="completed"
            )
            seasonal_appointments.append(appointment)
            
        # Fall/Winter: Sparse bookings (October, December only)
        for month in [10, 12]:
            appointment = AppointmentFactory(
                client_id=client.id,
                barber_id=barber.id,
                service_id=service.id,
                start_time=datetime(base_year, month, 15, 10, 0),
                status="completed"
            )
            seasonal_appointments.append(appointment)
            
        for appointment in seasonal_appointments:
            db.add(appointment)
        db.commit()
        
        # Analyze seasonal patterns
        pattern_analysis = self.client_service.analyze_booking_patterns(
            db=db,
            client_id=client.id,
            analyze_seasonality=True
        )
        
        # Verify seasonal pattern detection
        assert "seasonality" in pattern_analysis
        seasonality = pattern_analysis["seasonality"]
        
        assert seasonality["has_seasonal_pattern"] == True
        assert seasonality["peak_months"] is not None
        assert seasonality["low_months"] is not None
        
        # Spring/summer should be peak months
        peak_months = seasonality["peak_months"]
        assert any(month in [3, 4, 5, 6, 7, 8] for month in peak_months)
        
        # Fall should be low months (September, November had no bookings)
        low_months = seasonality["low_months"]
        assert any(month in [9, 11] for month in low_months)
        
    @pytest.mark.asyncio
    async def test_cancellation_pattern_analysis(self, db: Session):
        """Test analysis of client cancellation patterns"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        problem_client = ClientFactory(
            cancellation_count=5,
            no_show_count=2,
            total_visits=12
        )
        service = ServiceFactory()
        
        # Create mixed appointment history with cancellations
        appointment_statuses = [
            "completed", "completed", "cancelled", "completed", 
            "no_show", "completed", "cancelled", "completed",
            "completed", "cancelled", "no_show", "completed"
        ]
        
        appointments = []
        for i, status in enumerate(appointment_statuses):
            appointment = AppointmentFactory(
                client_id=problem_client.id,
                barber_id=barber.id,
                service_id=service.id,
                start_time=get_timezone_aware_now() - timedelta(days=30*i),
                status=status
            )
            appointments.append(appointment)
            db.add(appointment)
            
        db.commit()
        
        # Analyze cancellation patterns
        cancellation_analysis = self.retention_service.analyze_cancellation_patterns(
            db=db,
            client_id=problem_client.id
        )
        
        # Verify pattern analysis
        assert cancellation_analysis["cancellation_rate"] >= 0.2  # 20%+ cancellation rate
        assert cancellation_analysis["no_show_rate"] >= 0.15     # 15%+ no-show rate
        assert cancellation_analysis["reliability_score"] <= 0.7  # Low reliability
        
        # Check risk assessment
        risk_assessment = cancellation_analysis["risk_assessment"]
        assert risk_assessment["risk_level"] in ["medium", "high"]
        assert risk_assessment["churn_probability"] >= 0.4
        
        # Verify intervention recommendations
        assert "intervention_strategies" in cancellation_analysis
        strategies = cancellation_analysis["intervention_strategies"]
        
        # Should recommend deposit requirements for high-risk clients
        assert any("deposit" in strategy.lower() for strategy in strategies)
        assert any("confirmation" in strategy.lower() for strategy in strategies)
        
        # Test pattern-based booking restrictions
        booking_policy = self.client_service.calculate_booking_policy_adjustments(
            client=problem_client,
            cancellation_analysis=cancellation_analysis
        )
        
        assert booking_policy["requires_deposit"] == True
        assert booking_policy["advance_confirmation_required"] == True
        assert booking_policy["deposit_amount"] >= Decimal('10.00')


class TestLoyaltyAndRewardsProgram:
    """Test loyalty program and rewards system"""
    
    def setup_method(self):
        """Setup test data for each test"""
        self.analytics_service = AnalyticsService()
        self.client_service = ClientService()
        
    @pytest.mark.asyncio
    async def test_loyalty_points_accumulation(self, db: Session):
        """Test loyalty points accumulation system"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory(
            total_spent=Decimal('0.00'),
            total_visits=0
        )
        services = [
            ServiceFactory(name="Basic Cut", base_price=Decimal('45.00')),
            ServiceFactory(name="Premium Package", base_price=Decimal('85.00')),
            ServiceFactory(name="Signature Service", base_price=Decimal('120.00'))
        ]
        
        # Create appointment history for points accumulation
        appointments = [
            AppointmentFactory(
                client_id=client.id,
                barber_id=barber.id,
                service_id=services[0].id,
                price=services[0].base_price,
                status="completed",
                start_time=get_timezone_aware_now() - timedelta(days=90)
            ),
            AppointmentFactory(
                client_id=client.id,
                barber_id=barber.id,
                service_id=services[1].id,
                price=services[1].base_price,
                status="completed",
                start_time=get_timezone_aware_now() - timedelta(days=60)
            ),
            AppointmentFactory(
                client_id=client.id,
                barber_id=barber.id,
                service_id=services[2].id,
                price=services[2].base_price,
                status="completed",
                start_time=get_timezone_aware_now() - timedelta(days=30)
            )
        ]
        
        for appointment in appointments:
            db.add(appointment)
        db.commit()
        
        # Calculate loyalty points
        loyalty_status = self.loyalty_service.calculate_loyalty_status(
            db=db,
            client_id=client.id
        )
        
        # Verify points calculation (typically 1 point per dollar spent)
        total_spent = Decimal('250.00')  # 45 + 85 + 120
        expected_points = int(total_spent)
        
        assert loyalty_status["total_points"] == expected_points
        assert loyalty_status["points_balance"] <= expected_points  # Some might be redeemed
        
        # Check loyalty tier progression
        tier_info = loyalty_status["tier_info"]
        assert tier_info["current_tier"] in ["bronze", "silver", "gold", "platinum"]
        assert "next_tier" in tier_info
        assert "points_to_next_tier" in tier_info
        
        # Verify bonus point opportunities
        bonus_opportunities = loyalty_status["bonus_opportunities"]
        assert "referral_bonus" in bonus_opportunities
        assert "service_upgrade_bonus" in bonus_opportunities
        assert "social_media_bonus" in bonus_opportunities
        
    @pytest.mark.asyncio
    async def test_loyalty_reward_redemption(self, db: Session):
        """Test loyalty reward redemption system"""
        client = ClientFactory()
        
        # Setup client with sufficient points for redemption
        loyalty_account = {
            "client_id": client.id,
            "total_points_earned": 500,
            "points_balance": 350,
            "tier": "gold",
            "points_expiry_date": get_timezone_aware_now() + timedelta(days=365)
        }
        
        # Get available rewards for client tier
        available_rewards = self.loyalty_service.get_available_rewards(
            client_id=client.id,
            client_tier="gold",
            points_balance=350
        )
        
        # Should have various reward options
        assert len(available_rewards) > 0
        
        # Common reward categories
        reward_categories = [reward["category"] for reward in available_rewards]
        assert "service_discount" in reward_categories
        assert "free_service" in reward_categories or "upgrade" in reward_categories
        
        # Test reward redemption
        discount_reward = next(
            reward for reward in available_rewards 
            if reward["category"] == "service_discount"
        )
        
        redemption_result = self.loyalty_service.redeem_reward(
            db=db,
            client_id=client.id,
            reward_id=discount_reward["id"],
            points_cost=discount_reward["points_cost"]
        )
        
        # Verify successful redemption
        assert redemption_result["success"] == True
        assert redemption_result["reward_code"] is not None
        assert redemption_result["expiry_date"] is not None
        
        # Verify points deducted
        updated_loyalty = self.loyalty_service.get_loyalty_status(db=db, client_id=client.id)
        expected_balance = 350 - discount_reward["points_cost"]
        assert updated_loyalty["points_balance"] == expected_balance
        
    @pytest.mark.asyncio
    async def test_referral_bonus_system(self, db: Session):
        """Test client referral bonus system"""
        referring_client = ClientFactory(
            first_name="Alice",
            email="alice@example.com"
        )
        
        # Create referral
        referral_data = {
            "referred_by_client_id": referring_client.id,
            "referred_email": "bob.referred@example.com",
            "referred_name": "Bob Smith",
            "referral_message": "Great barber, you'll love the service!"
        }
        
        referral_result = self.loyalty_service.create_referral(
            db=db,
            referral_data=referral_data
        )
        
        # Verify referral creation
        assert referral_result["success"] == True
        assert "referral_id" in referral_result
        assert "referral_code" in referral_result
        
        # Simulate referred client booking appointment
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        service = ServiceFactory(base_price=Decimal('60.00'))
        
        # Create client account for referred person
        referred_client = ClientFactory(
            first_name="Bob",
            last_name="Smith",
            email="bob.referred@example.com"
        )
        
        # Create appointment using referral code
        referred_appointment = AppointmentFactory(
            client_id=referred_client.id,
            barber_id=barber.id,
            service_id=service.id,
            price=service.base_price,
            status="completed",
            notes=f"Referral code: {referral_result['referral_code']}"
        )
        db.add(referred_appointment)
        db.commit()
        
        # Process referral completion
        referral_completion = self.loyalty_service.complete_referral(
            db=db,
            referral_code=referral_result["referral_code"],
            appointment_id=referred_appointment.id
        )
        
        # Verify referral bonuses
        assert referral_completion["success"] == True
        
        bonuses = referral_completion["bonuses"]
        assert "referrer_bonus" in bonuses
        assert "referee_bonus" in bonuses
        
        # Typically both parties get rewards
        assert bonuses["referrer_bonus"]["points"] >= 50  # Referrer gets points
        assert bonuses["referee_bonus"]["discount_percentage"] >= 10  # Referee gets discount
        
    @pytest.mark.asyncio
    async def test_loyalty_tier_benefits(self, db: Session):
        """Test loyalty tier benefits and privileges"""
        # Create clients at different tiers
        tier_clients = [
            ClientFactory(total_spent=Decimal('150.00'), total_visits=3),    # Bronze
            ClientFactory(total_spent=Decimal('500.00'), total_visits=10),   # Silver
            ClientFactory(total_spent=Decimal('1200.00'), total_visits=18),  # Gold
            ClientFactory(total_spent=Decimal('2500.00'), total_visits=30),  # Platinum
        ]
        
        for client in tier_clients:
            db.add(client)
        db.commit()
        
        # Calculate tier benefits for each client
        tier_benefits_analysis = []
        
        for client in tier_clients:
            tier_info = self.loyalty_service.calculate_loyalty_tier(client)
            benefits = self.loyalty_service.get_tier_benefits(tier_info["tier"])
            
            tier_benefits_analysis.append({
                "client_id": client.id,
                "tier": tier_info["tier"],
                "benefits": benefits,
                "total_spent": client.total_spent
            })
            
        # Verify tier progression and benefits
        tiers = [analysis["tier"] for analysis in tier_benefits_analysis]
        assert "bronze" in tiers or "silver" in tiers
        assert "gold" in tiers or "platinum" in tiers
        
        # Verify higher tiers get better benefits
        highest_tier_analysis = max(tier_benefits_analysis, key=lambda x: x["total_spent"])
        lowest_tier_analysis = min(tier_benefits_analysis, key=lambda x: x["total_spent"])
        
        highest_benefits = highest_tier_analysis["benefits"]
        lowest_benefits = lowest_tier_analysis["benefits"]
        
        # Higher tier should have more benefits
        assert highest_benefits["discount_percentage"] > lowest_benefits["discount_percentage"]
        assert highest_benefits["points_multiplier"] >= lowest_benefits["points_multiplier"]
        
        # Platinum/Gold should have exclusive benefits
        if highest_tier_analysis["tier"] in ["platinum", "gold"]:
            assert highest_benefits.get("priority_booking") == True
            assert highest_benefits.get("exclusive_services") == True


class TestVIPClientHandling:
    """Test VIP client handling and premium services"""
    
    def setup_method(self):
        """Setup test data for each test"""
        self.client_service = ClientService()
        self.tier_service = ClientTierService()
        
    @pytest.mark.asyncio
    async def test_vip_client_identification(self, db: Session):
        """Test automatic VIP client identification and classification"""
        # Create high-value client that should qualify as VIP
        vip_client = ClientFactory(
            total_spent=Decimal('3000.00'),
            total_visits=35,
            average_ticket=Decimal('85.71'),  # High average spend
            last_visit_date=datetime.utcnow() - timedelta(days=10),  # Recent visit
            no_show_count=0,  # Reliable
            cancellation_count=1,  # Rarely cancels
            referral_count=4,  # Brings new business
            customer_type="returning"
        )
        db.add(vip_client)
        db.commit()
        
        # Test VIP identification
        vip_analysis = self.client_service.analyze_vip_potential(vip_client)
        
        # Verify VIP classification
        assert vip_analysis["is_vip"] == True
        assert vip_analysis["vip_score"] >= 85  # High VIP score
        
        # Check VIP criteria met
        criteria = vip_analysis["vip_criteria"]
        assert criteria["high_lifetime_value"] == True
        assert criteria["frequent_visitor"] == True
        assert criteria["premium_spender"] == True
        assert criteria["reliable_client"] == True
        assert criteria["business_referrer"] == True
        
        # Verify VIP benefits calculation
        vip_benefits = vip_analysis["vip_benefits"]
        assert vip_benefits["priority_booking"] == True
        assert vip_benefits["personal_barber_assignment"] == True
        assert vip_benefits["exclusive_services"] == True
        assert vip_benefits["complimentary_services"] == True
        
    @pytest.mark.asyncio
    async def test_vip_booking_priority_system(self, db: Session):
        """Test VIP client booking priority and privileges"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        
        # Create VIP and regular clients
        vip_client = ClientFactory(
            customer_type="vip",
            total_spent=Decimal('2800.00'),
            total_visits=32
        )
        regular_client = ClientFactory(
            customer_type="returning",
            total_spent=Decimal('400.00'),
            total_visits=8
        )
        
        db.add_all([vip_client, regular_client])
        db.commit()
        
        # Test priority booking scenarios
        booking_date = get_timezone_aware_now() + timedelta(days=3)
        
        # Simulate limited availability (only one slot left)
        existing_appointment = AppointmentFactory(
            barber_id=barber.id,
            start_time=booking_date.replace(hour=10),  # 10 AM slot taken
            status="confirmed",
            duration_minutes=60
        )
        db.add(existing_appointment)
        db.commit()
        
        # Test VIP priority access
        vip_priority = self.client_service.check_vip_booking_priority(
            db=db,
            client_id=vip_client.id,
            desired_time=booking_date.replace(hour=11),  # 11 AM slot
            barber_id=barber.id
        )
        
        # VIP should get priority access
        assert vip_priority["has_priority"] == True
        assert vip_priority["can_override_regular_bookings"] == True
        assert vip_priority["extended_booking_window"] == True
        
        # Regular client should not have these privileges
        regular_priority = self.client_service.check_vip_booking_priority(
            db=db,
            client_id=regular_client.id,
            desired_time=booking_date.replace(hour=11),
            barber_id=barber.id
        )
        
        assert regular_priority["has_priority"] == False
        assert regular_priority["can_override_regular_bookings"] == False
        
    @pytest.mark.asyncio
    async def test_vip_personalized_service_recommendations(self, db: Session):
        """Test personalized service recommendations for VIP clients"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        vip_client = ClientFactory(
            customer_type="vip",
            total_spent=Decimal('4200.00'),
            average_ticket=Decimal('105.00')  # High-spend client
        )
        
        # Create service history showing preferences
        services = [
            ServiceFactory(name="Signature Cut", base_price=Decimal('85.00'), six_fb_tier="premium"),
            ServiceFactory(name="Executive Package", base_price=Decimal('150.00'), six_fb_tier="signature"),
            ServiceFactory(name="Grooming Consultation", base_price=Decimal('200.00'), six_fb_tier="signature")
        ]
        
        # Create appointment history showing premium service preference
        premium_appointments = [
            AppointmentFactory(
                client_id=vip_client.id,
                barber_id=barber.id,
                service_id=services[0].id,
                price=services[0].base_price,
                status="completed"
            ),
            AppointmentFactory(
                client_id=vip_client.id,
                barber_id=barber.id,
                service_id=services[1].id,
                price=services[1].base_price,
                status="completed"
            )
        ]
        
        for appointment in premium_appointments:
            db.add(appointment)
        for service in services:
            db.add(service)
        db.commit()
        
        # Get VIP service recommendations
        vip_recommendations = self.client_service.generate_vip_service_recommendations(
            db=db,
            client_id=vip_client.id
        )
        
        # Verify premium recommendations
        assert len(vip_recommendations["premium_services"]) > 0
        assert len(vip_recommendations["exclusive_services"]) > 0
        
        # Should recommend signature services for VIP
        signature_services = [
            rec for rec in vip_recommendations["premium_services"] 
            if rec["tier"] == "signature"
        ]
        assert len(signature_services) > 0
        
        # Should include personalization based on history
        personalized_services = vip_recommendations["personalized_recommendations"]
        assert len(personalized_services) > 0
        
        # Verify pricing considerations for VIP
        pricing_strategy = vip_recommendations["pricing_strategy"]
        assert pricing_strategy["vip_discount_eligible"] == True
        assert pricing_strategy["exclusive_pricing"] == True
        
    @pytest.mark.asyncio
    async def test_vip_retention_and_relationship_management(self, db: Session):
        """Test VIP client retention strategies and relationship management"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        
        # Create at-risk VIP client (high value but showing decline)
        at_risk_vip = ClientFactory(
            customer_type="vip",
            total_spent=Decimal('5000.00'),  # High lifetime value
            total_visits=45,
            last_visit_date=datetime.utcnow() - timedelta(days=45),  # Haven't been recently
            visit_frequency_days=21,  # Usually comes every 3 weeks
            average_ticket=Decimal('111.11')
        )
        db.add(at_risk_vip)
        db.commit()
        
        # Analyze VIP retention risk
        retention_analysis = self.client_service.analyze_vip_retention_risk(
            db=db,
            client_id=at_risk_vip.id
        )
        
        # Should identify as at-risk
        assert retention_analysis["risk_level"] in ["medium", "high"]
        assert retention_analysis["days_since_last_visit"] >= 40
        assert retention_analysis["expected_visit_overdue"] == True
        
        # Should provide VIP-specific retention strategies
        retention_strategies = retention_analysis["retention_strategies"]
        vip_strategies = [
            strategy for strategy in retention_strategies 
            if "vip" in strategy.lower() or "premium" in strategy.lower()
        ]
        assert len(vip_strategies) > 0
        
        # Should include high-touch interventions
        interventions = retention_analysis["recommended_interventions"]
        assert "personal_outreach" in interventions
        assert "exclusive_offer" in interventions
        assert "relationship_manager_contact" in interventions
        
        # Calculate retention investment recommendation
        investment_recommendation = retention_analysis["retention_investment"]
        assert investment_recommendation["max_retention_spend"] >= Decimal('100.00')
        assert investment_recommendation["roi_projection"] > 1.0  # Positive ROI expected
        
        # VIP lifetime value justifies higher retention investment
        assert investment_recommendation["justification"] == "high_lifetime_value"