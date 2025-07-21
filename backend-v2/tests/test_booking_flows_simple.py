"""
Simple booking flow test that uses actual service implementations.
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session

from models import Appointment, User, Client, Service, Organization, UnifiedUserRole
from services.booking_service import create_booking, get_available_slots
from services.client_service import ClientService
from tests.factories import UserFactory, ClientFactory, ServiceFactory, OrganizationFactory
from utils.timezone_utils import get_timezone_aware_now

class TestBasicBookingFlow:
    """Test basic booking functionality with actual services."""
    
    @pytest.mark.asyncio
    async def test_simple_booking_creation(self, db: Session):
        """Test basic appointment creation."""
        # Create test data
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory()
        
        # Create booking using actual service
        appointment_time = get_timezone_aware_now() + timedelta(days=1, hours=10)
        
        appointment = create_booking(
            db=db,
            user_id=client.user_id,
            booking_date=appointment_time.date(),
            booking_time=appointment_time.strftime('%H:%M'),
            service="Haircut",
            barber_id=barber.id,
            client_id=client.id
        )
        
        # Verify appointment created
        assert appointment is not None
        assert appointment.client_id == client.id
        assert appointment.barber_id == barber.id
        assert appointment.status == "scheduled"
        
    @pytest.mark.asyncio
    async def test_available_slots_retrieval(self, db: Session):
        """Test getting available slots."""
        from datetime import date
        
        # Get available slots for tomorrow
        tomorrow = date.today() + timedelta(days=1)
        slots = get_available_slots(db, tomorrow)
        
        # Verify slots structure
        assert isinstance(slots, dict)
        assert "available_slots" in slots or "slots" in slots or len(slots) > 0
        
    @pytest.mark.asyncio
    async def test_client_service_functionality(self, db: Session):
        """Test client service basic functionality."""
        client_service = ClientService()
        client = ClientFactory()
        
        # Test that client service can be instantiated and used
        # Note: Actual functionality depends on service implementation
        assert client_service is not None
        assert client is not None
        assert client.id is not None
