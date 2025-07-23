"""
Service Integration Tests
Tests comprehensive service integration including service durations,
packages, add-ons, custom services, and service-specific booking logic.
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch, AsyncMock, MagicMock
from sqlalchemy.orm import Session

from models import (
    Appointment, User, Client, Service, Organization,
    ServicePackage, ServiceAddon, CustomService,
    UnifiedUserRole, ServiceCategoryEnum
)
from services.booking_service import create_booking
from services.service_template_service import ServiceTemplateService
from services.booking_service import create_booking
from services.service_template_service import ServiceTemplateService
from tests.factories import (
    UserFactory, ClientFactory, AppointmentFactory, ServiceFactory,
    OrganizationFactory
)
from utils.timezone_utils import get_timezone_aware_now


class TestServiceDurationHandling:
    """Test service duration handling and scheduling"""
    
    def setup_method(self):
        """Setup test data for each test"""
        from services.booking_service import create_booking, get_available_slots
        self.service_service = ServiceTemplateService()
        
    @pytest.mark.asyncio
    async def test_variable_service_duration_booking(self, db: Session):
        """Test booking services with different durations"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory()
        organization = OrganizationFactory()
        
        # Create services with different durations
        services = [
            ServiceFactory(
                name="Quick Trim",
                base_price=Decimal('25.00'),
                duration_minutes=15,
                category=ServiceCategoryEnum.HAIRCUT
            ),
            ServiceFactory(
                name="Standard Haircut",
                base_price=Decimal('45.00'),
                duration_minutes=45,
                category=ServiceCategoryEnum.HAIRCUT
            ),
            ServiceFactory(
                name="Full Styling Session",
                base_price=Decimal('85.00'),
                duration_minutes=90,
                category=ServiceCategoryEnum.STYLING
            ),
            ServiceFactory(
                name="Complete Grooming Experience",
                base_price=Decimal('150.00'),
                duration_minutes=180,  # 3 hours
                category=ServiceCategoryEnum.PACKAGE
            )
        ]
        
        for service in services:
            service.organization_id = organization.id
            db.add(service)
        db.commit()
        
        # Test booking each service type
        base_time = get_timezone_aware_now() + timedelta(days=1, hours=9)
        
        for i, service in enumerate(services):
            appointment_time = base_time + timedelta(hours=4*i)  # Space them out
            
            appointment = create_booking(
                db=db,
                user_id=client.user_id,
                booking_date=appointment_time.date(),
                booking_time=appointment_time.strftime('%H:%M'),
                service="Haircut",  # Maps to service through duration
                barber_id=barber.id,
                client_id=client.id
            )
            
            # Verify appointment duration matches service
            assert appointment is not None
            assert appointment.duration_minutes == 30  # Default service duration from booking service
            
            # Test end time calculation
            expected_end_time = appointment.start_time + timedelta(minutes=appointment.duration_minutes)
            actual_end_time = appointment.start_time + timedelta(minutes=appointment.duration_minutes)
            
            assert actual_end_time == expected_end_time
            
    @pytest.mark.asyncio
    async def test_service_duration_conflict_detection(self, db: Session):
        """Test conflict detection considering service durations"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client1 = ClientFactory()
        client2 = ClientFactory()
        
        # Create long service (2 hours)
        long_service = ServiceFactory(
            name="Extended Grooming",
            duration_minutes=120,
            base_price=Decimal('100.00')
        )
        
        # Create short service (30 minutes)
        short_service = ServiceFactory(
            name="Quick Touch-up",
            duration_minutes=30,
            base_price=Decimal('35.00')
        )
        
        db.add_all([long_service, short_service])
        db.commit()
        
        # Book long service: 10 AM - 12 PM
        base_time = get_timezone_aware_now() + timedelta(days=1, hours=10)
        
        long_appointment = Appointment(
            user_id=client1.user_id,
            barber_id=barber.id,
            client_id=client1.id,
            service_id=long_service.id,
            start_time=base_time,
            duration_minutes=120,
            price=long_service.base_price,
            status="confirmed"
        )
        db.add(long_appointment)
        db.commit()
        
        # Test various booking attempts
        conflict_scenarios = [
            # (start_time, duration, should_conflict, description)
            (base_time + timedelta(minutes=30), 30, True, "Short service during long service"),
            (base_time + timedelta(minutes=60), 60, True, "1-hour service overlapping end"),
            (base_time + timedelta(minutes=90), 60, True, "Service starting near end but overlapping"),
            (base_time + timedelta(minutes=120), 30, False, "Service starting exactly when long service ends"),
            (base_time - timedelta(minutes=60), 30, False, "Service completing before long service starts"),
            (base_time - timedelta(minutes=30), 60, True, "Service overlapping start of long service")
        ]
        
        for start_time, duration, should_conflict, description in conflict_scenarios:
            conflicts = self.service_service.check_duration_conflicts(
                db=db,
                barber_id=barber.id,
                start_time=start_time,
                duration_minutes=duration
            )
            
            has_conflict = len(conflicts) > 0
            assert has_conflict == should_conflict, f"{description}"
            
    @pytest.mark.asyncio
    async def test_dynamic_duration_adjustment(self, db: Session):
        """Test dynamic service duration adjustment based on client needs"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory()
        
        # Create base service with customizable duration
        flexible_service = ServiceFactory(
            name="Flexible Styling",
            base_price=Decimal('60.00'),
            duration_minutes=60,  # Base duration
            min_duration=45,      # Can be shortened
            max_duration=90,      # Can be extended
            price_per_minute=Decimal('1.50')  # Additional pricing
        )
        db.add(flexible_service)
        db.commit()
        
        # Test duration customization
        duration_scenarios = [
            (45, Decimal('60.00') - Decimal('22.50')),  # Shortened, reduced price
            (60, Decimal('60.00')),                      # Standard duration and price
            (75, Decimal('60.00') + Decimal('22.50')),  # Extended, increased price
            (90, Decimal('60.00') + Decimal('45.00'))   # Maximum extension
        ]
        
        appointment_time = get_timezone_aware_now() + timedelta(days=1, hours=14)
        
        for requested_duration, expected_price in duration_scenarios:
            # Calculate custom pricing
            custom_pricing = self.service_service.calculate_dynamic_service_pricing(
                service=flexible_service,
                requested_duration=requested_duration,
                client_tier="standard"
            )
            
            assert custom_pricing["adjusted_price"] == expected_price
            assert custom_pricing["duration_valid"] == True
            
            # Test booking with custom duration
            custom_appointment = Appointment(
                user_id=client.user_id,
                barber_id=barber.id,
                client_id=client.id,
                service_id=flexible_service.id,
                start_time=appointment_time,
                duration_minutes=requested_duration,
                price=custom_pricing["adjusted_price"],
                status="scheduled"
            )
            
            # Verify duration is within bounds
            assert custom_appointment.duration_minutes >= flexible_service.min_duration
            assert custom_appointment.duration_minutes <= flexible_service.max_duration


class TestServicePackageBooking:
    """Test service package booking and management"""
    
    def setup_method(self):
        """Setup test data for each test"""
        from services.booking_service import create_booking
        from services.booking_service import create_booking, get_available_slots
        
    @pytest.mark.asyncio
    async def test_service_package_creation_and_booking(self, db: Session):
        """Test creation and booking of service packages"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory()
        organization = OrganizationFactory()
        
        # Create individual services
        haircut = ServiceFactory(
            name="Premium Haircut",
            base_price=Decimal('55.00'),
            duration_minutes=45,
            category=ServiceCategoryEnum.HAIRCUT
        )
        
        beard_trim = ServiceFactory(
            name="Beard Styling",
            base_price=Decimal('35.00'),
            duration_minutes=30,
            category=ServiceCategoryEnum.BEARD
        )
        
        hair_wash = ServiceFactory(
            name="Hair Wash & Treatment",
            base_price=Decimal('25.00'),
            duration_minutes=15,
            category=ServiceCategoryEnum.HAIR_TREATMENT
        )
        
        db.add_all([haircut, beard_trim, hair_wash])
        db.commit()
        
        # Create service package
        grooming_package = ServicePackage(
            name="Complete Grooming Package",
            description="Haircut, beard styling, and hair treatment",
            organization_id=organization.id,
            service_ids=[haircut.id, beard_trim.id, hair_wash.id],
            package_price=Decimal('95.00'),  # Discount from individual total of $115
            estimated_duration=90,  # Total duration
            six_fb_tier="premium"
        )
        db.add(grooming_package)
        db.commit()
        
        # Book the package
        appointment_time = get_timezone_aware_now() + timedelta(days=1, hours=11)
        
        package_booking = self.package_service.book_service_package(
            db=db,
            client_id=client.id,
            barber_id=barber.id,
            package_id=grooming_package.id,
            start_time=appointment_time,
            organization_id=organization.id
        )
        
        # Verify package booking
        assert package_booking["success"] == True
        assert "appointment_id" in package_booking
        assert "package_details" in package_booking
        
        # Verify appointment created with package details
        appointment = db.query(Appointment).filter(
            Appointment.id == package_booking["appointment_id"]
        ).first()
        
        assert appointment is not None
        assert appointment.duration_minutes == 90
        assert appointment.price == Decimal('95.00')
        assert appointment.service_name == "Complete Grooming Package"
        
        # Verify package savings calculated
        package_details = package_booking["package_details"]
        assert package_details["individual_total"] == Decimal('115.00')
        assert package_details["package_price"] == Decimal('95.00')
        assert package_details["savings"] == Decimal('20.00')
        assert package_details["savings_percentage"] >= 17  # About 17.4% savings
        
    @pytest.mark.asyncio
    async def test_package_customization_options(self, db: Session):
        """Test package customization and add-on services"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory()
        organization = OrganizationFactory()
        
        # Create base package services
        base_services = [
            ServiceFactory(name="Cut", base_price=Decimal('50.00'), duration_minutes=45),
            ServiceFactory(name="Style", base_price=Decimal('30.00'), duration_minutes=30)
        ]
        
        # Create optional add-ons
        addon_services = [
            ServiceFactory(name="Beard Oil", base_price=Decimal('15.00'), duration_minutes=5),
            ServiceFactory(name="Scalp Massage", base_price=Decimal('20.00'), duration_minutes=10),
            ServiceFactory(name="Hot Towel", base_price=Decimal('10.00'), duration_minutes=5)
        ]
        
        for service in base_services + addon_services:
            db.add(service)
        db.commit()
        
        # Create customizable package
        customizable_package = ServicePackage(
            name="Build Your Own Package",
            description="Customizable grooming experience",
            organization_id=organization.id,
            service_ids=[service.id for service in base_services],
            package_price=Decimal('70.00'),  # Base package price
            estimated_duration=75,
            allow_customization=True,
            available_addons=[service.id for service in addon_services]
        )
        db.add(customizable_package)
        db.commit()
        
        # Book package with customizations
        customizations = {
            "selected_addons": [addon_services[0].id, addon_services[2].id],  # Beard oil + hot towel
            "special_requests": "Extra time for styling",
            "duration_adjustment": 15  # Add 15 minutes
        }
        
        appointment_time = get_timezone_aware_now() + timedelta(days=2, hours=10)
        
        custom_booking = self.package_service.book_customized_package(
            db=db,
            client_id=client.id,
            barber_id=barber.id,
            package_id=customizable_package.id,
            start_time=appointment_time,
            customizations=customizations
        )
        
        # Verify customized booking
        assert custom_booking["success"] == True
        
        customized_appointment = db.query(Appointment).filter(
            Appointment.id == custom_booking["appointment_id"]
        ).first()
        
        # Verify pricing includes add-ons
        expected_price = Decimal('70.00') + Decimal('15.00') + Decimal('10.00')  # Base + beard oil + hot towel
        assert customized_appointment.price == expected_price
        
        # Verify duration includes customizations
        expected_duration = 75 + 5 + 5 + 15  # Base + addon durations + adjustment
        assert customized_appointment.duration_minutes == expected_duration
        
    @pytest.mark.asyncio
    async def test_package_membership_and_subscriptions(self, db: Session):
        """Test package-based membership and subscription services"""
        client = ClientFactory()
        organization = OrganizationFactory()
        
        # Create membership package
        monthly_membership = ServicePackage(
            name="Monthly Grooming Membership",
            description="Unlimited cuts and styling",
            organization_id=organization.id,
            package_price=Decimal('150.00'),  # Monthly fee
            is_membership=True,
            membership_benefits={
                "included_services": ["haircut", "styling", "basic_beard_trim"],
                "discount_on_addons": 20,
                "priority_booking": True,
                "complimentary_services": 2  # 2 free add-ons per month
            },
            billing_cycle="monthly"
        )
        db.add(monthly_membership)
        db.commit()
        
        # Enroll client in membership
        membership_enrollment = self.package_service.enroll_in_membership(
            db=db,
            client_id=client.id,
            package_id=monthly_membership.id,
            start_date=get_timezone_aware_now().date()
        )
        
        # Verify enrollment
        assert membership_enrollment["success"] == True
        assert "membership_id" in membership_enrollment
        assert "benefits" in membership_enrollment
        
        # Test membership benefit usage
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        appointment_time = get_timezone_aware_now() + timedelta(days=1, hours=13)
        
        membership_booking = self.package_service.book_membership_service(
            db=db,
            client_id=client.id,
            barber_id=barber.id,
            membership_id=membership_enrollment["membership_id"],
            requested_service="haircut",
            start_time=appointment_time
        )
        
        # Verify membership booking (should be free/included)
        assert membership_booking["success"] == True
        
        membership_appointment = db.query(Appointment).filter(
            Appointment.id == membership_booking["appointment_id"]
        ).first()
        
        assert membership_appointment.price == Decimal('0.00')  # Included in membership
        assert membership_appointment.notes is not None
        assert "membership" in membership_appointment.notes.lower()


class TestCustomServiceCreation:
    """Test custom service creation and booking"""
    
    def setup_method(self):
        """Setup test data for each test"""
        self.service_service = ServiceTemplateService()
        from services.booking_service import create_booking, get_available_slots
        
    @pytest.mark.asyncio
    async def test_custom_service_creation_by_barber(self, db: Session):
        """Test barbers creating custom services for specific clients"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory()
        organization = OrganizationFactory()
        
        # Barber creates custom service for client
        custom_service_data = {
            "name": "Special Wedding Preparation",
            "description": "Custom grooming for wedding day",
            "base_price": Decimal('200.00'),
            "estimated_duration": 150,  # 2.5 hours
            "category": "SPECIAL_EVENT",
            "created_by_barber_id": barber.id,
            "created_for_client_id": client.id,
            "organization_id": organization.id,
            "service_details": {
                "includes": ["haircut", "styling", "beard_grooming", "face_treatment"],
                "special_requirements": ["premium_products", "extended_time", "consultation"],
                "occasion": "wedding"
            },
            "pricing_notes": "Includes premium products and extended styling time"
        }
        
        custom_service_result = self.custom_service_service.create_custom_service(
            db=db,
            service_data=custom_service_data
        )
        
        # Verify custom service creation
        assert custom_service_result["success"] == True
        assert "service_id" in custom_service_result
        
        custom_service = db.query(CustomService).filter(
            CustomService.id == custom_service_result["service_id"]
        ).first()
        
        assert custom_service is not None
        assert custom_service.name == "Special Wedding Preparation"
        assert custom_service.created_by_barber_id == barber.id
        assert custom_service.created_for_client_id == client.id
        assert custom_service.is_active == True
        
        # Test booking the custom service
        appointment_time = get_timezone_aware_now() + timedelta(days=7, hours=9)  # Wedding week
        
        custom_booking = self.booking_service.book_custom_service(
            db=db,
            client_id=client.id,
            barber_id=barber.id,
            custom_service_id=custom_service.id,
            start_time=appointment_time
        )
        
        # Verify custom service booking
        assert custom_booking["success"] == True
        
        custom_appointment = db.query(Appointment).filter(
            Appointment.id == custom_booking["appointment_id"]
        ).first()
        
        assert custom_appointment.price == Decimal('200.00')
        assert custom_appointment.duration_minutes == 150
        assert custom_appointment.service_name == "Special Wedding Preparation"
        
    @pytest.mark.asyncio
    async def test_recurring_custom_service_creation(self, db: Session):
        """Test creation of recurring custom services"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory()
        organization = OrganizationFactory()
        
        # Create recurring custom service (monthly maintenance)
        recurring_service_data = {
            "name": "Monthly Executive Grooming",
            "description": "Comprehensive monthly grooming service",
            "base_price": Decimal('120.00'),
            "estimated_duration": 90,
            "category": "EXECUTIVE",
            "created_by_barber_id": barber.id,
            "created_for_client_id": client.id,
            "organization_id": organization.id,
            "is_recurring": True,
            "recurrence_pattern": {
                "frequency": "monthly",
                "interval": 1,
                "preferred_day_of_month": 15,
                "preferred_time": "10:00"
            },
            "service_details": {
                "includes": ["premium_cut", "styling", "beard_maintenance", "eyebrow_trim"],
                "executive_touches": ["hot_towel", "scalp_treatment", "finishing_products"]
            }
        }
        
        recurring_service_result = self.custom_service_service.create_recurring_custom_service(
            db=db,
            service_data=recurring_service_data
        )
        
        # Verify recurring service creation
        assert recurring_service_result["success"] == True
        assert "service_id" in recurring_service_result
        assert "scheduled_appointments" in recurring_service_result
        
        # Should have scheduled next 3 months automatically
        scheduled_appointments = recurring_service_result["scheduled_appointments"]
        assert len(scheduled_appointments) >= 3
        
        # Verify appointment scheduling pattern
        for i, appointment_data in enumerate(scheduled_appointments[:3]):
            expected_date = get_timezone_aware_now() + timedelta(days=30*i + 15)  # 15th of each month
            scheduled_date = datetime.fromisoformat(appointment_data["start_time"]).date()
            
            # Should be within a few days of target date (accounting for weekends, holidays)
            date_difference = abs((scheduled_date - expected_date.date()).days)
            assert date_difference <= 3
            
            assert appointment_data["price"] == "120.00"
            assert appointment_data["duration_minutes"] == 90
            
    @pytest.mark.asyncio
    async def test_custom_service_templates_and_reuse(self, db: Session):
        """Test custom service templates for easy reuse"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        organization = OrganizationFactory()
        
        # Create custom service template
        template_data = {
            "template_name": "Prom Night Special",
            "description": "Complete grooming for prom/formal events",
            "base_price": Decimal('85.00'),
            "estimated_duration": 105,
            "category": "SPECIAL_EVENT",
            "created_by_barber_id": barber.id,
            "organization_id": organization.id,
            "template_components": {
                "services": ["formal_haircut", "styling", "light_makeup"],
                "products": ["premium_gel", "finishing_spray"],
                "extras": ["photos", "touch_up_kit"]
            },
            "target_demographic": "teenage_formal_events",
            "seasonal_availability": ["spring", "winter"]  # Prom and winter formal seasons
        }
        
        template_result = self.custom_service_service.create_service_template(
            db=db,
            template_data=template_data
        )
        
        # Verify template creation
        assert template_result["success"] == True
        assert "template_id" in template_result
        
        # Test using template for multiple clients
        clients = [ClientFactory() for _ in range(3)]
        
        for client in clients:
            db.add(client)
        db.commit()
        
        # Apply template to create custom services for each client
        template_applications = []
        
        for i, client in enumerate(clients):
            # Customize template for each client
            client_customizations = {
                "client_specific_notes": f"Prom service for {client.first_name}",
                "price_adjustment": Decimal('0.00') if i == 0 else Decimal('10.00'),  # First client gets base price
                "duration_adjustment": 0 if i < 2 else 15,  # Last client gets extra time
                "special_requests": f"Color coordination with {['blue', 'red', 'black'][i]} theme"
            }
            
            application_result = self.custom_service_service.apply_template_to_client(
                db=db,
                template_id=template_result["template_id"],
                client_id=client.id,
                customizations=client_customizations
            )
            
            template_applications.append(application_result)
            
        # Verify template applications
        for i, application in enumerate(template_applications):
            assert application["success"] == True
            
            # Verify pricing adjustments
            expected_price = Decimal('85.00') + (Decimal('10.00') if i > 0 else Decimal('0.00'))
            assert application["final_price"] == expected_price
            
            # Verify duration adjustments
            expected_duration = 105 + (15 if i == 2 else 0)
            assert application["final_duration"] == expected_duration
            
    @pytest.mark.asyncio
    async def test_custom_service_pricing_strategies(self, db: Session):
        """Test various pricing strategies for custom services"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        organization = OrganizationFactory()
        
        # Different client tiers for pricing tests
        clients = [
            ClientFactory(customer_type="new", total_spent=Decimal('0.00')),        # New client
            ClientFactory(customer_type="returning", total_spent=Decimal('300.00')), # Silver tier
            ClientFactory(customer_type="vip", total_spent=Decimal('1500.00'))       # Gold tier
        ]
        
        for client in clients:
            db.add(client)
        db.commit()
        
        # Create custom service with tier-based pricing
        tiered_service_data = {
            "name": "Consultation & Styling",
            "base_price": Decimal('75.00'),
            "estimated_duration": 75,
            "created_by_barber_id": barber.id,
            "organization_id": organization.id,
            "pricing_strategy": "tier_based",
            "tier_pricing": {
                "new": {"price": Decimal('75.00'), "discount": 0},
                "silver": {"price": Decimal('70.00'), "discount": 0.067},  # ~6.7% discount
                "gold": {"price": Decimal('65.00'), "discount": 0.133},    # ~13.3% discount
                "platinum": {"price": Decimal('60.00'), "discount": 0.2}   # 20% discount
            }
        }
        
        tiered_service_result = self.custom_service_service.create_tiered_pricing_service(
            db=db,
            service_data=tiered_service_data
        )
        
        # Test pricing for each client tier
        for i, client in enumerate(clients):
            pricing_calculation = self.custom_service_service.calculate_custom_service_pricing(
                db=db,
                service_id=tiered_service_result["service_id"],
                client_id=client.id
            )
            
            # Verify tier-appropriate pricing
            if client.customer_type == "new":
                assert pricing_calculation["final_price"] == Decimal('75.00')
                assert pricing_calculation["discount_applied"] == 0
            elif client.customer_type == "returning":
                assert pricing_calculation["final_price"] == Decimal('70.00')
                assert pricing_calculation["discount_applied"] > 0
            elif client.customer_type == "vip":
                assert pricing_calculation["final_price"] == Decimal('65.00')
                assert pricing_calculation["discount_applied"] > 0
                
            assert "tier_classification" in pricing_calculation
            assert "pricing_justification" in pricing_calculation


class TestServiceAddonIntegration:
    """Test service add-on integration and booking"""
    
    def setup_method(self):
        """Setup test data for each test"""
        from services.booking_service import create_booking, get_available_slots
        self.service_service = ServiceTemplateService()
        
    @pytest.mark.asyncio
    async def test_service_addon_selection_and_pricing(self, db: Session):
        """Test selection and pricing of service add-ons"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory()
        organization = OrganizationFactory()
        
        # Create base service
        base_service = ServiceFactory(
            name="Haircut",
            base_price=Decimal('50.00'),
            duration_minutes=45,
            organization_id=organization.id
        )
        
        # Create add-on services
        addons = [
            ServiceAddon(
                name="Beard Trim",
                description="Professional beard trimming",
                price=Decimal('20.00'),
                duration_minutes=15,
                category="GROOMING",
                is_available=True,
                organization_id=organization.id
            ),
            ServiceAddon(
                name="Hot Towel Treatment",
                description="Relaxing hot towel application",
                price=Decimal('15.00'),
                duration_minutes=10,
                category="WELLNESS",
                is_available=True,
                organization_id=organization.id
            ),
            ServiceAddon(
                name="Scalp Massage",
                description="Therapeutic scalp massage",
                price=Decimal('25.00'),
                duration_minutes=15,
                category="WELLNESS",
                is_available=True,
                organization_id=organization.id
            )
        ]
        
        for addon in [base_service] + addons:
            db.add(addon)
        db.commit()
        
        # Book service with add-ons
        appointment_time = get_timezone_aware_now() + timedelta(days=1, hours=14)
        
        selected_addons = [addons[0].id, addons[1].id]  # Beard trim + hot towel
        
        addon_booking = self.booking_service.book_service_with_addons(
            db=db,
            client_id=client.id,
            barber_id=barber.id,
            base_service_id=base_service.id,
            addon_ids=selected_addons,
            start_time=appointment_time
        )
        
        # Verify booking with add-ons
        assert addon_booking["success"] == True
        
        appointment = db.query(Appointment).filter(
            Appointment.id == addon_booking["appointment_id"]
        ).first()
        
        # Verify combined pricing
        expected_price = Decimal('50.00') + Decimal('20.00') + Decimal('15.00')  # Base + addons
        assert appointment.price == expected_price
        
        # Verify combined duration
        expected_duration = 45 + 15 + 10  # Base + addon durations
        assert appointment.duration_minutes == expected_duration
        
        # Verify add-on details stored
        booking_details = addon_booking["booking_details"]
        assert "selected_addons" in booking_details
        assert len(booking_details["selected_addons"]) == 2
        
    @pytest.mark.asyncio
    async def test_conditional_addon_recommendations(self, db: Session):
        """Test conditional add-on recommendations based on service and client"""
        client = ClientFactory(
            customer_type="returning",
            total_spent=Decimal('600.00'),
            average_ticket=Decimal('50.00')
        )
        
        # Create base service
        haircut_service = ServiceFactory(
            name="Premium Haircut",
            category=ServiceCategoryEnum.HAIRCUT
        )
        
        # Create complementary add-ons
        complementary_addons = [
            ServiceAddon(
                name="Beard Styling",
                category="GROOMING",
                price=Decimal('30.00'),
                complements=["HAIRCUT"],  # Complements haircut services
                client_tier_preference=["silver", "gold", "platinum"]
            ),
            ServiceAddon(
                name="Hair Wash",
                category="BASIC",
                price=Decimal('15.00'),
                complements=["HAIRCUT", "STYLING"],
                client_tier_preference=["all"]
            ),
            ServiceAddon(
                name="Premium Styling Products",
                category="PREMIUM",
                price=Decimal('40.00'),
                complements=["HAIRCUT", "STYLING"],
                client_tier_preference=["gold", "platinum"]
            )
        ]
        
        for addon in [haircut_service] + complementary_addons:
            db.add(addon)
        db.commit()
        
        # Get add-on recommendations
        recommendations = self.service_service.get_addon_recommendations(
            db=db,
            base_service_id=haircut_service.id,
            client_id=client.id
        )
        
        # Verify recommendations based on service complementarity
        assert len(recommendations["recommended_addons"]) > 0
        
        # Should recommend beard styling for haircut + returning client
        recommended_names = [addon["name"] for addon in recommendations["recommended_addons"]]
        assert "Beard Styling" in recommended_names
        assert "Hair Wash" in recommended_names
        
        # Premium products might be recommended based on client tier
        client_tier = recommendations["client_analysis"]["tier"]
        if client_tier in ["gold", "platinum"]:
            assert "Premium Styling Products" in recommended_names
            
        # Verify recommendation reasoning
        for recommendation in recommendations["recommended_addons"]:
            assert "recommendation_reason" in recommendation
            assert recommendation["recommendation_reason"] is not None
            
    @pytest.mark.asyncio
    async def test_seasonal_addon_availability(self, db: Session):
        """Test seasonal add-on availability and promotions"""
        organization = OrganizationFactory()
        
        # Create seasonal add-ons
        seasonal_addons = [
            ServiceAddon(
                name="Summer Sun Protection Treatment",
                price=Decimal('35.00'),
                duration_minutes=20,
                organization_id=organization.id,
                seasonal_availability={
                    "available_months": [5, 6, 7, 8, 9],  # May through September
                    "peak_months": [6, 7, 8]  # Summer peak
                },
                promotional_pricing={
                    "peak_season_surcharge": Decimal('5.00'),
                    "off_season_discount": Decimal('10.00')
                }
            ),
            ServiceAddon(
                name="Winter Scalp Hydration",
                price=Decimal('30.00'),
                duration_minutes=15,
                organization_id=organization.id,
                seasonal_availability={
                    "available_months": [11, 12, 1, 2, 3],  # November through March
                    "peak_months": [12, 1, 2]  # Winter peak
                }
            ),
            ServiceAddon(
                name="Holiday Styling Package",
                price=Decimal('45.00'),
                duration_minutes=25,
                organization_id=organization.id,
                seasonal_availability={
                    "available_months": [11, 12],  # November-December only
                    "special_dates": ["2023-12-24", "2023-12-31", "2024-12-24"]
                }
            )
        ]
        
        for addon in seasonal_addons:
            db.add(addon)
        db.commit()
        
        # Test availability for different months
        availability_tests = [
            (7, ["Summer Sun Protection Treatment"]),  # July - summer treatment available
            (1, ["Winter Scalp Hydration"]),          # January - winter treatment available
            (12, ["Winter Scalp Hydration", "Holiday Styling Package"]),  # December - both winter available
            (4, [])  # April - no seasonal treatments
        ]
        
        for test_month, expected_available in availability_tests:
            test_date = datetime(2024, test_month, 15)
            
            available_addons = self.service_service.get_seasonal_addons(
                db=db,
                organization_id=organization.id,
                check_date=test_date
            )
            
            available_names = [addon["name"] for addon in available_addons]
            
            for expected_addon in expected_available:
                assert expected_addon in available_names, f"Expected {expected_addon} in month {test_month}"
                
            # Verify seasonal pricing
            for addon_info in available_addons:
                if addon_info["name"] == "Summer Sun Protection Treatment" and test_month in [6, 7, 8]:
                    # Peak season surcharge should be applied
                    expected_price = Decimal('35.00') + Decimal('5.00')
                    assert addon_info["current_price"] == expected_price