"""
Comprehensive Multi-Role Booking Flow Tests
Tests booking functionality across all user roles with Six Figure Barber methodology integration.
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi import status
from sqlalchemy.orm import Session

from models import (
    User, Appointment, Service, Payment, Client, Organization, ServiceTemplate,
    UnifiedUserRole, ServiceCategoryEnum
)
from schemas import AppointmentCreate, AppointmentUpdate
from services.booking_service import create_booking
from services.client_tier_service import ClientTierService
from services.six_fb_compliance_service import SixFBComplianceService
from tests.factories import (
    UserFactory, ClientFactory, AppointmentFactory, ServiceFactory,
    PaymentFactory, OrganizationFactory
)
from utils.timezone_utils import get_timezone_aware_now


class TestMultiRoleBookingCreation:
    """Test booking creation across all user roles"""
    
    def setup_method(self):
        """Setup test data for each test"""
        from services.booking_service import create_booking, get_available_slots
        self.client_tier_service = ClientTierService()
        
    @pytest.mark.asyncio
    async def test_client_guest_booking_flow(self, db: Session, async_client, mock_notification_service):
        """Test CLIENT role creating booking without account (guest booking)"""
        # Setup
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        organization = OrganizationFactory()
        service = ServiceFactory(
            base_price=Decimal('45.00'),
            category=ServiceCategoryEnum.HAIRCUT,
            six_fb_tier="standard"
        )
        
        # Create appointment availability
        appointment_time = get_timezone_aware_now() + timedelta(days=1, hours=10)
        
        booking_data = {
            "barber_id": barber.id,
            "service_id": service.id,
            "organization_id": organization.id,
            "start_time": appointment_time.isoformat(),
            "duration_minutes": 60,
            "client_info": {
                "first_name": "John",
                "last_name": "Doe", 
                "email": "john.doe@example.com",
                "phone": "+1234567890"
            },
            "notes": "First time client - guest booking"
        }
        
        with patch('services.notification_service.send_booking_confirmation') as mock_notification:
            response = await async_client.post("/api/v1/appointments/guest-booking", json=booking_data)
            
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        appointment = db.query(Appointment).filter(Appointment.id == data["appointment"]["id"]).first()
        
        # Verify appointment creation
        assert appointment is not None
        assert appointment.status == "pending"
        assert appointment.price == Decimal('45.00')
        assert appointment.barber_id == barber.id
        assert appointment.service_id == service.id
        
        # Verify client creation
        client = db.query(Client).filter(Client.id == appointment.client_id).first()
        assert client.first_name == "John"
        assert client.last_name == "Doe"
        assert client.email == "john.doe@example.com"
        assert client.customer_type == "new"
        
        # Verify notification sent
        mock_notification.assert_called_once()
        
        # Verify guest booking token generated for future access
        assert "guest_token" in data
        assert data["account_creation_prompt"] == True
        
    @pytest.mark.asyncio 
    async def test_client_authenticated_booking_flow(self, db: Session, client, auth_headers):
        """Test authenticated CLIENT creating their own booking"""
        # Setup
        user = UserFactory(unified_role=UnifiedUserRole.CLIENT)
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        organization = OrganizationFactory()
        service = ServiceFactory(
            base_price=Decimal('60.00'),
            category=ServiceCategoryEnum.BEARD,
            six_fb_tier="premium"
        )
        
        # Create existing client profile
        existing_client = ClientFactory(
            user_id=user.id,
            total_spent=Decimal('300.00'),
            total_visits=5,
            customer_type="returning"
        )
        
        appointment_time = get_timezone_aware_now() + timedelta(days=2, hours=14)
        
        booking_data = {
            "barber_id": barber.id,
            "service_id": service.id,
            "organization_id": organization.id,
            "start_time": appointment_time.isoformat(),
            "duration_minutes": 90,
            "notes": "Returning client booking premium service"
        }
        
        # Mock Six Figure Barber upselling
        with patch('services.booking_service.generate_6fb_upselling_suggestions') as mock_upsell:
            mock_upsell.return_value = [
                {
                    "service_id": service.id + 1,
                    "name": "Beard Oil Treatment",
                    "price": 25.00,
                    "revenue_impact": "41.7%"
                }
            ]
            
            response = client.post("/api/v1/appointments", json=booking_data, headers=auth_headers)
            
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        appointment = db.query(Appointment).filter(Appointment.id == data["id"]).first()
        
        # Verify appointment
        assert appointment.user_id == user.id
        assert appointment.client_id == existing_client.id
        assert appointment.price == Decimal('60.00')
        assert appointment.status == "confirmed"  # Authenticated users get auto-confirmation
        
        # Verify upselling suggestions provided
        assert "upselling_suggestions" in data
        assert len(data["upselling_suggestions"]) > 0
        
        # Verify client tier calculation triggered
        tier_data = self.client_tier_service.calculate_client_tier(existing_client)
        assert tier_data["tier"] in ["bronze", "silver", "gold", "platinum"]
        
    @pytest.mark.asyncio
    async def test_barber_creates_appointment_for_client(self, db: Session, client):
        """Test BARBER role creating appointment for their client"""
        # Setup
        barber_user = UserFactory(unified_role=UnifiedUserRole.BARBER)
        organization = OrganizationFactory()
        client_profile = ClientFactory()
        service = ServiceFactory(
            base_price=Decimal('55.00'),
            category=ServiceCategoryEnum.HAIRCUT
        )
        
        # Generate auth headers for barber
        barber_auth = {"Authorization": f"Bearer barber_token_{barber_user.id}"}
        
        appointment_time = get_timezone_aware_now() + timedelta(days=1, hours=9)
        
        booking_data = {
            "client_id": client_profile.id,
            "service_id": service.id,
            "organization_id": organization.id,
            "start_time": appointment_time.isoformat(),
            "duration_minutes": 60,
            "price": 55.00,  # Barber can adjust pricing
            "notes": "Walk-in client booking",
            "status": "confirmed"  # Barber can directly confirm
        }
        
        with patch('services.booking_service.validate_barber_permissions') as mock_validate:
            mock_validate.return_value = True
            
            response = client.post("/api/v1/appointments/barber-booking", json=booking_data, headers=barber_auth)
            
        assert response.status_code == status.HTTP_201_CREATED
        
        appointment = db.query(Appointment).filter(Appointment.barber_id == barber_user.id).first()
        assert appointment is not None
        assert appointment.client_id == client_profile.id
        assert appointment.status == "confirmed"
        assert appointment.price == Decimal('55.00')
        
        # Verify barber-specific features
        assert appointment.created_by_barber == True
        assert appointment.payment_method == "in_person"  # Default for barber bookings
        
    @pytest.mark.asyncio
    async def test_shop_owner_creates_appointment_any_barber(self, db: Session, client):
        """Test SHOP_OWNER creating appointment for any barber in their shop"""
        # Setup
        shop_owner = UserFactory(unified_role=UnifiedUserRole.SHOP_OWNER)
        organization = OrganizationFactory(owner_id=shop_owner.id)
        
        # Create barbers in the shop
        barber1 = UserFactory(unified_role=UnifiedUserRole.BARBER)
        barber2 = UserFactory(unified_role=UnifiedUserRole.BARBER)
        
        # Associate barbers with organization
        from models import UserOrganization
        db.add(UserOrganization(user_id=barber1.id, organization_id=organization.id))
        db.add(UserOrganization(user_id=barber2.id, organization_id=organization.id))
        
        client_profile = ClientFactory()
        service = ServiceFactory(base_price=Decimal('70.00'))
        
        owner_auth = {"Authorization": f"Bearer owner_token_{shop_owner.id}"}
        
        appointment_time = get_timezone_aware_now() + timedelta(days=3, hours=11)
        
        booking_data = {
            "barber_id": barber1.id,  # Shop owner can assign to any barber
            "client_id": client_profile.id,
            "service_id": service.id,
            "organization_id": organization.id,
            "start_time": appointment_time.isoformat(),
            "duration_minutes": 75,
            "price": 70.00,
            "notes": "Premium service booking by shop owner",
            "payment_status": "pending"
        }
        
        with patch('services.permissions.check_shop_owner_permissions') as mock_perms:
            mock_perms.return_value = True
            
            response = client.post("/api/v1/appointments/shop-owner-booking", json=booking_data, headers=owner_auth)
            
        assert response.status_code == status.HTTP_201_CREATED
        
        appointment = db.query(Appointment).first()
        assert appointment.barber_id == barber1.id
        assert appointment.organization_id == organization.id
        assert appointment.created_by_shop_owner == True
        
        # Verify shop owner capabilities
        data = response.json()
        assert "revenue_impact" in data  # Shop owners see revenue analytics
        assert "barber_commission" in data  # Commission calculations
        
    @pytest.mark.asyncio
    async def test_enterprise_owner_multi_location_booking(self, db: Session, client):
        """Test ENTERPRISE_OWNER creating appointments across multiple locations"""
        # Setup enterprise owner
        enterprise_owner = UserFactory(unified_role=UnifiedUserRole.ENTERPRISE_OWNER)
        
        # Create multiple organizations/locations
        location1 = OrganizationFactory(
            name="Downtown Location",
            parent_organization_id=None,
            organization_type="location"
        )
        location2 = OrganizationFactory(
            name="Mall Location", 
            parent_organization_id=location1.id,
            organization_type="location"
        )
        
        # Create barbers at different locations
        barber_location1 = UserFactory(unified_role=UnifiedUserRole.BARBER)
        barber_location2 = UserFactory(unified_role=UnifiedUserRole.BARBER)
        
        # Setup services at both locations
        service1 = ServiceFactory(base_price=Decimal('80.00'), organization_id=location1.id)
        service2 = ServiceFactory(base_price=Decimal('85.00'), organization_id=location2.id)
        
        client_profile = ClientFactory(
            total_spent=Decimal('2500.00'),
            total_visits=25,
            customer_type="vip"
        )
        
        enterprise_auth = {"Authorization": f"Bearer enterprise_token_{enterprise_owner.id}"}
        
        # Create booking at location 1
        appointment_time1 = get_timezone_aware_now() + timedelta(days=1, hours=10)
        
        booking_data1 = {
            "barber_id": barber_location1.id,
            "client_id": client_profile.id,
            "service_id": service1.id,
            "organization_id": location1.id,
            "start_time": appointment_time1.isoformat(),
            "duration_minutes": 90,
            "notes": "VIP client - premium service",
            "client_tier": "platinum"
        }
        
        with patch('services.enterprise_booking_service.validate_cross_location_booking') as mock_validate:
            mock_validate.return_value = True
            
            response1 = client.post("/api/v1/appointments/enterprise-booking", json=booking_data1, headers=enterprise_auth)
            
        assert response1.status_code == status.HTTP_201_CREATED
        
        # Create booking at location 2
        appointment_time2 = get_timezone_aware_now() + timedelta(days=2, hours=15)
        
        booking_data2 = {
            "barber_id": barber_location2.id,
            "client_id": client_profile.id,
            "service_id": service2.id,
            "organization_id": location2.id,
            "start_time": appointment_time2.isoformat(),
            "duration_minutes": 120,
            "notes": "Follow-up service at different location"
        }
        
        response2 = client.post("/api/v1/appointments/enterprise-booking", json=booking_data2, headers=enterprise_auth)
        assert response2.status_code == status.HTTP_201_CREATED
        
        # Verify enterprise capabilities
        appointments = db.query(Appointment).filter(Appointment.client_id == client_profile.id).all()
        assert len(appointments) == 2
        assert appointments[0].organization_id != appointments[1].organization_id
        
        # Verify enterprise analytics
        data = response1.json()
        assert "cross_location_analytics" in data
        assert "enterprise_revenue_impact" in data
        
    @pytest.mark.asyncio
    async def test_role_based_booking_permissions(self, db: Session, client):
        """Test role-based permissions for booking creation"""
        # Setup different roles
        client_user = UserFactory(unified_role=UnifiedUserRole.CLIENT)
        barber_user = UserFactory(unified_role=UnifiedUserRole.BARBER) 
        viewer_user = UserFactory(unified_role=UnifiedUserRole.VIEWER)
        
        organization = OrganizationFactory()
        service = ServiceFactory()
        client_profile = ClientFactory()
        
        appointment_time = get_timezone_aware_now() + timedelta(days=1, hours=12)
        
        booking_data = {
            "barber_id": barber_user.id,
            "client_id": client_profile.id,
            "service_id": service.id,
            "organization_id": organization.id,
            "start_time": appointment_time.isoformat(),
            "duration_minutes": 60
        }
        
        # Test CLIENT can book for themselves
        client_auth = {"Authorization": f"Bearer client_token_{client_user.id}"}
        response = client.post("/api/v1/appointments", json=booking_data, headers=client_auth)
        assert response.status_code == status.HTTP_201_CREATED
        
        # Test VIEWER cannot create bookings
        viewer_auth = {"Authorization": f"Bearer viewer_token_{viewer_user.id}"}
        response = client.post("/api/v1/appointments", json=booking_data, headers=viewer_auth)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Test BARBER can book for clients
        barber_auth = {"Authorization": f"Bearer barber_token_{barber_user.id}"}
        booking_data["notes"] = "Barber booking for client"
        response = client.post("/api/v1/appointments/barber-booking", json=booking_data, headers=barber_auth)
        assert response.status_code == status.HTTP_201_CREATED
        
    @pytest.mark.asyncio
    async def test_six_figure_barber_upselling_integration(self, db: Session, client, auth_headers):
        """Test Six Figure Barber upselling suggestions during booking"""
        # Setup client with booking history
        user = UserFactory(unified_role=UnifiedUserRole.CLIENT)
        client_profile = ClientFactory(
            user_id=user.id,
            total_spent=Decimal('500.00'),
            total_visits=8,
            customer_type="returning"
        )
        
        # Create service history
        haircut_service = ServiceFactory(
            name="Signature Haircut",
            category=ServiceCategoryEnum.HAIRCUT,
            base_price=Decimal('45.00'),
            six_fb_tier="standard"
        )
        
        beard_service = ServiceFactory(
            name="Premium Beard Trim",
            category=ServiceCategoryEnum.BEARD,
            base_price=Decimal('35.00'),
            six_fb_tier="premium"
        )
        
        styling_service = ServiceFactory(
            name="Hair Styling",
            category=ServiceCategoryEnum.STYLING,
            base_price=Decimal('25.00'),
            six_fb_tier="standard"
        )
        
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        organization = OrganizationFactory()
        
        appointment_time = get_timezone_aware_now() + timedelta(days=1, hours=13)
        
        booking_data = {
            "barber_id": barber.id,
            "service_id": haircut_service.id,
            "organization_id": organization.id,
            "start_time": appointment_time.isoformat(),
            "duration_minutes": 60
        }
        
        with patch('services.booking_service.generate_6fb_upselling_suggestions') as mock_upsell:
            # Mock Six Figure Barber upselling logic
            mock_upsell.return_value = [
                {
                    "service_id": beard_service.id,
                    "name": "Premium Beard Trim",
                    "base_price": "35.00",
                    "category": "BEARD",
                    "revenue_impact": "77.8%",
                    "recommendation_reason": "Complementary to haircut service",
                    "six_fb_tier": "premium"
                },
                {
                    "service_id": styling_service.id,
                    "name": "Hair Styling", 
                    "base_price": "25.00",
                    "category": "STYLING",
                    "revenue_impact": "55.6%",
                    "recommendation_reason": "Complete the premium experience",
                    "six_fb_tier": "standard"
                }
            ]
            
            response = client.post("/api/v1/appointments", json=booking_data, headers=auth_headers)
            
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        
        # Verify upselling suggestions included
        assert "upselling_suggestions" in data
        assert len(data["upselling_suggestions"]) == 2
        
        # Verify revenue impact calculations
        suggestions = data["upselling_suggestions"]
        assert suggestions[0]["revenue_impact"] == "77.8%"
        assert suggestions[1]["revenue_impact"] == "55.6%"
        
        # Verify Six Figure Barber categorization
        assert any(s["six_fb_tier"] == "premium" for s in suggestions)
        assert any(s["recommendation_reason"] for s in suggestions)
        
        # Verify client tier consideration
        mock_upsell.assert_called_once_with(
            client_id=client_profile.id,
            base_service_id=haircut_service.id,
            client_tier="silver"  # Based on total_spent and visits
        )
        
    @pytest.mark.asyncio
    async def test_booking_with_six_fb_compliance_tracking(self, db: Session):
        """Test booking creation with Six Figure Barber compliance tracking"""
        # Setup barber with compliance tracking
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        organization = OrganizationFactory()
        
        # Create service aligned with 6FB methodology
        premium_service = ServiceFactory(
            name="Six Figure Signature Cut",
            base_price=Decimal('75.00'),  # Premium pricing
            category=ServiceCategoryEnum.HAIRCUT,
            six_fb_tier="premium",
            six_fb_category="signature_service"
        )
        
        client_profile = ClientFactory(
            total_spent=Decimal('150.00'),
            total_visits=3,
            customer_type="returning"
        )
        
        compliance_service = SixFBComplianceService()
        
        # Track compliance before booking
        initial_score = compliance_service.calculate_compliance_score(barber.id)
        
        # Create booking
        appointment = Appointment(
            barber_id=barber.id,
            client_id=client_profile.id,
            service_id=premium_service.id,
            organization_id=organization.id,
            start_time=get_timezone_aware_now() + timedelta(days=1),
            duration_minutes=90,
            price=Decimal('75.00'),
            status="confirmed"
        )
        
        db.add(appointment)
        db.commit()
        
        # Track compliance after booking
        updated_score = compliance_service.calculate_compliance_score(barber.id)
        
        # Verify compliance improvements
        assert updated_score["overall_score"] >= initial_score["overall_score"]
        assert updated_score["pricing_strategy"]["score"] > 0.7  # Premium pricing
        assert updated_score["service_portfolio"]["premium_service_ratio"] > 0.0
        
        # Verify Six Figure Barber metrics tracking
        compliance_data = compliance_service.get_compliance_details(barber.id)
        assert compliance_data["total_premium_bookings"] >= 1
        assert compliance_data["average_service_price"] >= 70.00
        assert compliance_data["methodology_adherence"] == "improving"

class TestBookingValidationAndBusinessRules:
    """Test booking validation and Six Figure Barber business rules"""
    
    @pytest.mark.asyncio
    async def test_premium_service_pricing_validation(self, db: Session):
        """Test Six Figure Barber premium service pricing rules"""
        service = ServiceFactory(
            name="Premium Haircut & Style",
            base_price=Decimal('60.00'),  # Above $60 threshold
            six_fb_tier="premium"
        )
        
        booking_service = BookingService()
        
        # Test premium service categorization
        is_premium = booking_service.is_premium_service(service)
        assert is_premium == True
        
        # Test pricing validation
        pricing_rules = booking_service.validate_six_fb_pricing(service)
        assert pricing_rules["meets_premium_threshold"] == True
        assert pricing_rules["suggested_upsell_opportunity"] == True
        
    @pytest.mark.asyncio  
    async def test_client_tier_based_pricing(self, db: Session):
        """Test client tier-based pricing adjustments"""
        # Setup platinum client (highest tier)
        platinum_client = ClientFactory(
            total_spent=Decimal('2500.00'),
            total_visits=30,
            average_ticket=Decimal('83.33'),
            customer_type="vip"
        )
        
        # Setup standard service
        service = ServiceFactory(
            base_price=Decimal('50.00'),
            tier_based_pricing={
                "platinum": {"discount": 0.1, "exclusive_services": True},
                "gold": {"discount": 0.05},
                "silver": {"discount": 0.0},
                "bronze": {"discount": 0.0}
            }
        )
        
        client_tier_service = ClientTierService()
        tier_data = client_tier_service.calculate_client_tier(platinum_client)
        
        # Verify platinum tier calculation
        assert tier_data["tier"] == "platinum"
        assert tier_data["discount_eligible"] == True
        
        # Test tier-based pricing
        booking_service = BookingService()
        adjusted_price = booking_service.calculate_tier_based_pricing(
            service, tier_data["tier"]
        )
        
        assert adjusted_price == Decimal('45.00')  # 10% discount for platinum
        
    @pytest.mark.asyncio
    async def test_booking_capacity_and_availability(self, db: Session):
        """Test booking capacity limits and availability validation"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        organization = OrganizationFactory()
        service = ServiceFactory(duration_minutes=60)
        
        base_time = get_timezone_aware_now() + timedelta(days=1, hours=10)
        
        # Create existing appointment
        existing_appointment = AppointmentFactory(
            barber_id=barber.id,
            start_time=base_time,
            duration_minutes=60,
            status="confirmed"
        )
        db.add(existing_appointment)
        db.commit()
        
        booking_service = BookingService()
        
        # Test overlapping appointment prevention
        is_available = booking_service.check_availability(
            barber_id=barber.id,
            start_time=base_time + timedelta(minutes=30),  # Overlaps
            duration_minutes=60
        )
        assert is_available == False
        
        # Test non-overlapping appointment
        is_available = booking_service.check_availability(
            barber_id=barber.id,
            start_time=base_time + timedelta(hours=2),  # No overlap
            duration_minutes=60
        )
        assert is_available == True
        
    @pytest.mark.asyncio
    async def test_six_figure_barber_service_mix_validation(self, db: Session):
        """Test Six Figure Barber service mix and portfolio validation"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        
        # Create service portfolio
        basic_service = ServiceFactory(
            base_price=Decimal('35.00'),
            six_fb_tier="standard",
            category=ServiceCategoryEnum.HAIRCUT
        )
        
        premium_service = ServiceFactory(
            base_price=Decimal('75.00'),
            six_fb_tier="premium", 
            category=ServiceCategoryEnum.STYLING
        )
        
        signature_service = ServiceFactory(
            base_price=Decimal('100.00'),
            six_fb_tier="signature",
            category=ServiceCategoryEnum.PACKAGE
        )
        
        # Create appointment history
        appointments = [
            AppointmentFactory(
                barber_id=barber.id,
                service_id=basic_service.id,
                price=basic_service.base_price,
                status="completed"
            ),
            AppointmentFactory(
                barber_id=barber.id,
                service_id=premium_service.id,
                price=premium_service.base_price,
                status="completed"
            ),
            AppointmentFactory(
                barber_id=barber.id,
                service_id=signature_service.id,
                price=signature_service.base_price,
                status="completed"
            )
        ]
        
        for appointment in appointments:
            db.add(appointment)
        db.commit()
        
        compliance_service = SixFBComplianceService()
        service_mix = compliance_service.analyze_service_mix(barber.id)
        
        # Verify Six Figure Barber service mix compliance
        assert service_mix["total_services"] == 3
        assert service_mix["premium_ratio"] >= 0.33  # At least 1/3 premium
        assert service_mix["average_service_price"] >= 70.00
        assert service_mix["six_fb_compliance"] == "excellent"
        
        # Verify service tier distribution
        tier_distribution = service_mix["tier_distribution"]
        assert "standard" in tier_distribution
        assert "premium" in tier_distribution
        assert "signature" in tier_distribution