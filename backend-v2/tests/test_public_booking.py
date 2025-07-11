"""Tests for public booking functionality."""

import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from models import User, Service, Organization
from models.guest_booking import GuestBooking
from models.organization import UserOrganization
from services.guest_booking_service import guestBookingService


@pytest.fixture
def test_organization(db_session: Session):
    """Create a test organization."""
    # Create owner
    owner = User(
        email="owner@test.com",
        name="Test Owner",
        hashed_password="hashed",
        role="admin",
        unified_role="shop_owner",
        is_active=True
    )
    db_session.add(owner)
    db_session.commit()
    
    # Create organization
    org = Organization(
        name="Test Barbershop",
        slug="test-barbershop",
        email="shop@test.com",
        phone="555-1234",
        timezone="America/Los_Angeles",
        subscription_status="active",
        is_active=True
    )
    db_session.add(org)
    db_session.commit()
    
    # Add owner to organization through UserOrganization
    user_org = UserOrganization(
        user_id=owner.id,
        organization_id=org.id,
        role="owner",
        is_primary=True
    )
    db_session.add(user_org)
    db_session.commit()
    
    return org


@pytest.fixture
def test_barber(db_session: Session, test_organization: Organization):
    """Create a test barber."""
    barber = User(
        email="barber@test.com",
        name="Test Barber",
        hashed_password="hashed",
        role="barber",
        unified_role="barber",
        is_active=True
    )
    db_session.add(barber)
    db_session.commit()
    
    # Add to organization
    user_org = UserOrganization(
        user_id=barber.id,
        organization_id=test_organization.id,
        role="barber"
    )
    db_session.add(user_org)
    db_session.commit()
    
    return barber


@pytest.fixture
def test_service(db_session: Session, test_barber: User):
    """Create a test service."""
    service = Service(
        user_id=test_barber.id,
        name="Haircut",
        duration=30,
        price=35.00,
        description="Classic haircut",
        is_active=True
    )
    db_session.add(service)
    db_session.commit()
    
    return service


class TestGuestBookingService:
    """Test guest booking service functionality."""
    
    def test_generate_confirmation_code(self):
        """Test confirmation code generation."""
        code1 = guestBookingService.generate_confirmation_code()
        code2 = guestBookingService.generate_confirmation_code()
        
        assert len(code1) == 8
        assert code1.isalnum()
        assert code1 != code2  # Should be unique
    
    def test_get_organization_services(
        self,
        db_session: Session,
        test_organization: Organization,
        test_service: Service
    ):
        """Test getting organization services."""
        services = guestBookingService.get_organization_services(
            db=db_session,
            organization=test_organization
        )
        
        assert len(services) == 1
        assert services[0].id == test_service.id
        assert services[0].name == "Haircut"
        assert services[0].price == 35.00
    
    def test_get_organization_barbers(
        self,
        db_session: Session,
        test_organization: Organization,
        test_barber: User
    ):
        """Test getting organization barbers."""
        barbers = guestBookingService.get_organization_barbers(
            db=db_session,
            organization=test_organization
        )
        
        assert len(barbers) == 1
        assert barbers[0].id == test_barber.id
        assert barbers[0].name == "Test Barber"
    
    def test_create_guest_booking(
        self,
        db_session: Session,
        test_organization: Organization,
        test_barber: User,
        test_service: Service
    ):
        """Test creating a guest booking."""
        from schemas_new.guest_booking import GuestBookingCreate
        
        booking_data = GuestBookingCreate(
            guest_name="John Doe",
            guest_email="john@example.com",
            guest_phone="555-555-5555",
            service_id=test_service.id,
            barber_id=test_barber.id,
            appointment_datetime=datetime.utcnow() + timedelta(days=1),
            appointment_timezone="America/Los_Angeles",
            notes="First time customer",
            marketing_consent=True,
            reminder_preference="both"
        )
        
        guest_booking = guestBookingService.create_guest_booking(
            db=db_session,
            organization=test_organization,
            booking_data=booking_data,
            user_agent="Mozilla/5.0",
            ip_address="192.168.1.1"
        )
        
        assert guest_booking.id is not None
        assert guest_booking.guest_name == "John Doe"
        assert guest_booking.guest_email == "john@example.com"
        assert guest_booking.organization_id == test_organization.id
        assert guest_booking.barber_id == test_barber.id
        assert guest_booking.service_id == test_service.id
        assert guest_booking.status == "pending"
        assert len(guest_booking.confirmation_code) == 8
        assert guest_booking.converted_to_appointment_id is not None  # Should create appointment
    
    def test_lookup_guest_booking(
        self,
        db_session: Session,
        test_organization: Organization,
        test_barber: User,
        test_service: Service
    ):
        """Test looking up a guest booking."""
        from schemas_new.guest_booking import GuestBookingCreate
        
        booking_data = GuestBookingCreate(
            guest_name="Jane Doe",
            guest_email="jane@example.com",
            guest_phone="555-111-2222",
            service_id=test_service.id,
            barber_id=test_barber.id,
            appointment_datetime=datetime.utcnow() + timedelta(days=2),
            appointment_timezone="America/Los_Angeles"
        )
        
        guest_booking = guestBookingService.create_guest_booking(
            db=db_session,
            organization=test_organization,
            booking_data=booking_data
        )
        
        # Test lookup by email
        found_booking = guestBookingService.lookup_guest_booking(
            db=db_session,
            confirmation_code=guest_booking.confirmation_code,
            email_or_phone="jane@example.com"
        )
        
        assert found_booking is not None
        assert found_booking.id == guest_booking.id
        
        # Test lookup by phone
        found_booking = guestBookingService.lookup_guest_booking(
            db=db_session,
            confirmation_code=guest_booking.confirmation_code,
            email_or_phone="555-111-2222"
        )
        
        assert found_booking is not None
        assert found_booking.id == guest_booking.id
        
        # Test invalid lookup
        found_booking = guestBookingService.lookup_guest_booking(
            db=db_session,
            confirmation_code="INVALID",
            email_or_phone="jane@example.com"
        )
        
        assert found_booking is None
    
    def test_cancel_guest_booking(
        self,
        db_session: Session,
        test_organization: Organization,
        test_barber: User,
        test_service: Service
    ):
        """Test cancelling a guest booking."""
        from schemas_new.guest_booking import GuestBookingCreate
        
        # Create a booking
        booking_data = GuestBookingCreate(
            guest_name="Cancel Test",
            guest_email="cancel@example.com",
            guest_phone="555-999-8888",
            service_id=test_service.id,
            barber_id=test_barber.id,
            appointment_datetime=datetime.utcnow() + timedelta(days=3),
            appointment_timezone="America/Los_Angeles"
        )
        
        guest_booking = guestBookingService.create_guest_booking(
            db=db_session,
            organization=test_organization,
            booking_data=booking_data
        )
        
        # Cancel the booking
        cancelled_booking = guestBookingService.cancel_guest_booking(
            db=db_session,
            guest_booking=guest_booking,
            reason="Changed plans"
        )
        
        assert cancelled_booking.status == "cancelled"
        
        # Try to cancel again (should fail)
        with pytest.raises(ValueError, match="already cancelled"):
            guestBookingService.cancel_guest_booking(
                db=db_session,
                guest_booking=cancelled_booking
            )


class TestPublicBookingAPI:
    """Test public booking API endpoints."""
    
    def test_get_organization_by_slug(
        self,
        client: TestClient,
        test_organization: Organization
    ):
        """Test getting organization by slug."""
        response = client.get(f"/api/v1/public/booking/organization/{test_organization.slug}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == test_organization.slug
        assert data["name"] == test_organization.name
        assert data["timezone"] == test_organization.timezone
    
    def test_get_organization_not_found(self, client: TestClient):
        """Test getting non-existent organization."""
        response = client.get("/api/v1/public/booking/organization/non-existent")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_get_organization_services(
        self,
        client: TestClient,
        test_organization: Organization,
        test_service: Service
    ):
        """Test getting organization services."""
        response = client.get(f"/api/v1/public/booking/organization/{test_organization.slug}/services")
        
        assert response.status_code == 200
        services = response.json()
        assert len(services) == 1
        assert services[0]["name"] == "Haircut"
        assert services[0]["price"] == 35.00
    
    def test_create_public_booking(
        self,
        client: TestClient,
        test_organization: Organization,
        test_barber: User,
        test_service: Service
    ):
        """Test creating a public booking."""
        booking_data = {
            "guest_name": "API Test User",
            "guest_email": "api.test@example.com",
            "guest_phone": "555-777-8888",
            "service_id": test_service.id,
            "barber_id": test_barber.id,
            "appointment_datetime": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "appointment_timezone": "America/Los_Angeles",
            "notes": "API test booking",
            "marketing_consent": True,
            "reminder_preference": "email"
        }
        
        response = client.post(
            f"/api/v1/public/booking/organization/{test_organization.slug}/book",
            json=booking_data
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["guest_name"] == "API Test User"
        assert result["status"] == "pending"
        assert "confirmation_code" in result
        assert len(result["confirmation_code"]) == 8
    
    def test_lookup_booking(
        self,
        client: TestClient,
        db_session: Session,
        test_organization: Organization,
        test_barber: User,
        test_service: Service
    ):
        """Test looking up a booking."""
        # Create a booking first
        from schemas_new.guest_booking import GuestBookingCreate
        
        booking_data = GuestBookingCreate(
            guest_name="Lookup Test",
            guest_email="lookup@example.com",
            guest_phone="555-333-4444",
            service_id=test_service.id,
            barber_id=test_barber.id,
            appointment_datetime=datetime.utcnow() + timedelta(days=1),
            appointment_timezone="America/Los_Angeles"
        )
        
        guest_booking = guestBookingService.create_guest_booking(
            db=db_session,
            organization=test_organization,
            booking_data=booking_data
        )
        
        # Test lookup
        lookup_data = {
            "confirmation_code": guest_booking.confirmation_code,
            "email_or_phone": "lookup@example.com"
        }
        
        response = client.post(
            "/api/v1/public/booking/booking/lookup",
            json=lookup_data
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["guest_name"] == "Lookup Test"
        assert result["confirmation_code"] == guest_booking.confirmation_code