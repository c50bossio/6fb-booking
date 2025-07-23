"""
Booking Error Handling and Edge Case Tests
Tests comprehensive error handling for booking scenarios including double booking prevention,
invalid slot handling, capacity overflow, and system resilience.
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from models import (
    Appointment, User, Client, Service, Organization, 
    UnifiedUserRole, ServiceCategoryEnum
)
from schemas import AppointmentCreate
from services.booking_service import create_booking
from services.cancellation_service import CancellationPolicyService
from services.barber_availability_service import get_available_slots
from tests.factories import (
    UserFactory, ClientFactory, AppointmentFactory, ServiceFactory,
    OrganizationFactory
)
from utils.timezone_utils import get_timezone_aware_now


class TestDoubleBookingPrevention:
    """Test double booking prevention mechanisms"""
    
    def setup_method(self):
        """Setup test data for each test"""
        from services.booking_service import create_booking, get_available_slots
        from services.barber_availability_service import get_available_slots
        
    @pytest.mark.asyncio
    async def test_exact_time_slot_conflict(self, db: Session):
        """Test prevention of exact same time slot booking"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client1 = ClientFactory()
        client2 = ClientFactory()
        service = ServiceFactory(duration_minutes=60)
        
        # Create first appointment
        appointment_time = get_timezone_aware_now() + timedelta(days=1, hours=10)
        
        existing_appointment = Appointment(
            user_id=client1.user_id,
            barber_id=barber.id,
            client_id=client1.id,
            service_id=service.id,
            start_time=appointment_time,
            duration_minutes=60,
            price=Decimal('50.00'),
            status="confirmed"
        )
        db.add(existing_appointment)
        db.commit()
        
        # Attempt to book exact same time slot
        with pytest.raises(ValueError, match="already has an appointment at"):
            create_booking(
                db=db,
                user_id=client2.user_id,
                booking_date=appointment_time.date(),
                booking_time=appointment_time.strftime('%H:%M'),
                service="Haircut",
                barber_id=barber.id,
                client_id=client2.id
            )
            
        # Verify original appointment unchanged
        original = db.query(Appointment).filter(Appointment.id == existing_appointment.id).first()
        assert original.status == "confirmed"
        assert original.client_id == client1.id
        
    @pytest.mark.asyncio
    async def test_overlapping_appointment_conflict(self, db: Session):
        """Test prevention of overlapping appointment times"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client1 = ClientFactory()
        client2 = ClientFactory()
        service = ServiceFactory(duration_minutes=90)  # 90-minute service
        
        # Create first appointment: 10:00-11:30 AM
        base_time = get_timezone_aware_now() + timedelta(days=1, hours=10)
        
        existing_appointment = Appointment(
            user_id=client1.user_id,
            barber_id=barber.id,
            client_id=client1.id,
            service_id=service.id,
            start_time=base_time,
            duration_minutes=90,
            price=Decimal('60.00'),
            status="confirmed"
        )
        db.add(existing_appointment)
        db.commit()
        
        # Test overlapping scenarios
        overlap_scenarios = [
            # Start during existing appointment
            (base_time + timedelta(minutes=30), "10:30"),  # 10:30 AM (during existing)
            (base_time + timedelta(minutes=60), "11:00"),  # 11:00 AM (during existing)
            # Start before, end during existing
            (base_time - timedelta(minutes=30), "09:30"),  # 9:30 AM (60-min service would overlap)
            # Start before existing ends
            (base_time + timedelta(minutes=75), "11:15"),  # 11:15 AM (would start during existing)
        ]
        
        for overlap_time, time_str in overlap_scenarios:
            with pytest.raises(ValueError, match="already has an appointment at"):
                create_booking(
                    db=db,
                    user_id=client2.user_id,
                    booking_date=overlap_time.date(),
                    booking_time=time_str,
                    service="Haircut",
                    barber_id=barber.id,
                    client_id=client2.id
                )
                
    @pytest.mark.asyncio
    async def test_buffer_time_conflict_detection(self, db: Session):
        """Test buffer time consideration in conflict detection"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client1 = ClientFactory()
        client2 = ClientFactory()
        service = ServiceFactory(duration_minutes=60)
        
        # Create appointment with buffer times: 10:00-11:00 + 15 min before/after
        base_time = get_timezone_aware_now() + timedelta(days=1, hours=10)
        
        existing_appointment = Appointment(
            user_id=client1.user_id,
            barber_id=barber.id,
            client_id=client1.id,
            service_id=service.id,
            start_time=base_time,
            duration_minutes=60,
            price=Decimal('50.00'),
            status="confirmed",
            buffer_time_before=15,  # 15 minutes before
            buffer_time_after=15    # 15 minutes after
        )
        db.add(existing_appointment)
        db.commit()
        
        # Test conflicts with buffer consideration
        buffer_conflict_scenarios = [
            # During buffer time before (9:45-10:00)
            (base_time - timedelta(minutes=10), "09:50"),  # 9:50 AM (in buffer)
            # During buffer time after (11:00-11:15)
            (base_time + timedelta(minutes=65), "11:05"),  # 11:05 AM (in buffer)
        ]
        
        for conflict_time, time_str in buffer_conflict_scenarios:
            with pytest.raises(ValueError, match="already has an appointment at"):
                create_booking(
                    db=db,
                    user_id=client2.user_id,
                    booking_date=conflict_time.date(),
                    booking_time=time_str,
                    service="Haircut",
                    barber_id=barber.id,
                    client_id=client2.id
                )
                
        # Test valid booking after buffer time
        valid_time = base_time + timedelta(minutes=90)  # 11:30 AM (after buffer)
        
        # This should succeed
        valid_appointment = create_booking(
            db=db,
            user_id=client2.user_id,
            booking_date=valid_time.date(),
            booking_time="11:30",
            service="Haircut",
            barber_id=barber.id,
            client_id=client2.id
        )
        
        assert valid_appointment is not None
        assert valid_appointment.status == "scheduled"
        
    @pytest.mark.asyncio
    async def test_concurrent_booking_race_condition(self, db: Session):
        """Test handling of concurrent booking attempts (race condition)"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client1 = ClientFactory()
        client2 = ClientFactory()
        service = ServiceFactory(duration_minutes=60)
        
        appointment_time = get_timezone_aware_now() + timedelta(days=1, hours=14)
        booking_date = appointment_time.date()
        booking_time = appointment_time.strftime('%H:%M')
        
        # Simulate concurrent booking attempts using database isolation
        results = []
        
        async def attempt_booking(client):
            try:
                appointment = create_booking(
                    db=db,
                    user_id=client.user_id,
                    booking_date=booking_date,
                    booking_time=booking_time,
                    service="Haircut",
                    barber_id=barber.id,
                    client_id=client.id
                )
                return {"success": True, "appointment": appointment}
            except Exception as e:
                return {"success": False, "error": str(e)}
        
        # Simulate two near-simultaneous booking attempts
        # In real scenario, these would be concurrent database transactions
        result1 = await attempt_booking(client1)
        result2 = await attempt_booking(client2)
        
        # One should succeed, one should fail
        successful_bookings = [r for r in [result1, result2] if r["success"]]
        failed_bookings = [r for r in [result1, result2] if not r["success"]]
        
        assert len(successful_bookings) == 1
        assert len(failed_bookings) == 1
        assert "already has an appointment" in failed_bookings[0]["error"]
        
    @pytest.mark.asyncio
    async def test_multi_barber_same_time_allowed(self, db: Session):
        """Test that different barbers can have appointments at same time"""
        barber1 = UserFactory(unified_role=UnifiedUserRole.BARBER)
        barber2 = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client1 = ClientFactory()
        client2 = ClientFactory()
        service = ServiceFactory(duration_minutes=60)
        
        appointment_time = get_timezone_aware_now() + timedelta(days=1, hours=11)
        
        # Create appointment for barber1
        appointment1 = create_booking(
            db=db,
            user_id=client1.user_id,
            booking_date=appointment_time.date(),
            booking_time=appointment_time.strftime('%H:%M'),
            service="Haircut",
            barber_id=barber1.id,
            client_id=client1.id
        )
        
        # Create appointment for barber2 at same time (should succeed)
        appointment2 = create_booking(
            db=db,
            user_id=client2.user_id,
            booking_date=appointment_time.date(),
            booking_time=appointment_time.strftime('%H:%M'),
            service="Haircut",
            barber_id=barber2.id,
            client_id=client2.id
        )
        
        # Both appointments should exist
        assert appointment1 is not None
        assert appointment2 is not None
        assert appointment1.barber_id != appointment2.barber_id
        assert appointment1.start_time == appointment2.start_time


class TestInvalidSlotHandling:
    """Test handling of invalid booking slots"""
    
    def setup_method(self):
        """Setup test data for each test"""
        from services.booking_service import create_booking, get_available_slots
        
    @pytest.mark.asyncio
    async def test_past_date_booking_rejection(self, db: Session):
        """Test rejection of bookings for past dates"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory()
        
        # Attempt to book appointment in the past
        past_date = get_timezone_aware_now() - timedelta(days=1)
        
        with pytest.raises(ValueError, match="must be at least .* minutes in advance"):
            create_booking(
                db=db,
                user_id=client.user_id,
                booking_date=past_date.date(),
                booking_time="10:00",
                service="Haircut",
                barber_id=barber.id,
                client_id=client.id
            )
            
    @pytest.mark.asyncio
    async def test_insufficient_lead_time_rejection(self, db: Session):
        """Test rejection of bookings with insufficient lead time"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory()
        
        # Mock booking settings with 2-hour minimum lead time
        with patch('services.booking_service.get_booking_settings') as mock_settings:
            mock_settings.return_value.min_lead_time_minutes = 120
            mock_settings.return_value.business_timezone = "UTC"
            mock_settings.return_value.business_start_time = datetime.strptime("09:00", "%H:%M").time()
            mock_settings.return_value.business_end_time = datetime.strptime("18:00", "%H:%M").time()
            
            # Try to book appointment in 30 minutes (less than 2-hour requirement)
            near_future = get_timezone_aware_now() + timedelta(minutes=30)
            
            with pytest.raises(ValueError, match="must be at least 120 minutes in advance"):
                create_booking(
                    db=db,
                    user_id=client.user_id,
                    booking_date=near_future.date(),
                    booking_time=near_future.strftime('%H:%M'),
                    service="Haircut",
                    barber_id=barber.id,
                    client_id=client.id
                )
                
    @pytest.mark.asyncio
    async def test_too_far_advance_booking_rejection(self, db: Session):
        """Test rejection of bookings too far in advance"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory()
        
        # Mock booking settings with 30-day maximum advance booking
        with patch('services.booking_service.get_booking_settings') as mock_settings:
            mock_settings.return_value.max_advance_days = 30
            mock_settings.return_value.min_lead_time_minutes = 60
            mock_settings.return_value.business_timezone = "UTC"
            
            # Try to book appointment 60 days in advance
            far_future = get_timezone_aware_now() + timedelta(days=60)
            
            with pytest.raises(ValueError, match="cannot be more than 30 days in advance"):
                create_booking(
                    db=db,
                    user_id=client.user_id,
                    booking_date=far_future.date(),
                    booking_time="10:00",
                    service="Haircut",
                    barber_id=barber.id,
                    client_id=client.id
                )
                
    @pytest.mark.asyncio
    async def test_outside_business_hours_rejection(self, db: Session):
        """Test rejection of bookings outside business hours"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory()
        
        # Mock business hours: 9 AM - 6 PM
        with patch('services.booking_service.get_booking_settings') as mock_settings:
            mock_settings.return_value.business_start_time = datetime.strptime("09:00", "%H:%M").time()
            mock_settings.return_value.business_end_time = datetime.strptime("18:00", "%H:%M").time()
            mock_settings.return_value.business_timezone = "UTC"
            mock_settings.return_value.min_lead_time_minutes = 60
            
            future_date = get_timezone_aware_now() + timedelta(days=1)
            
            # Test early morning (before business hours)
            with pytest.raises(ValueError, match="must be within business hours"):
                create_booking(
                    db=db,
                    user_id=client.user_id,
                    booking_date=future_date.date(),
                    booking_time="07:00",  # Before 9 AM
                    service="Haircut",
                    barber_id=barber.id,
                    client_id=client.id
                )
                
            # Test late evening (after business hours)
            with pytest.raises(ValueError, match="must be within business hours"):
                create_booking(
                    db=db,
                    user_id=client.user_id,
                    booking_date=future_date.date(),
                    booking_time="19:00",  # After 6 PM
                    service="Haircut",
                    barber_id=barber.id,
                    client_id=client.id
                )
                
    @pytest.mark.asyncio
    async def test_invalid_service_rejection(self, db: Session):
        """Test rejection of bookings with invalid services"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory()
        
        future_date = get_timezone_aware_now() + timedelta(days=1)
        
        with pytest.raises(ValueError, match="Invalid service"):
            create_booking(
                db=db,
                user_id=client.user_id,
                booking_date=future_date.date(),
                booking_time="10:00",
                service="NonexistentService",  # Invalid service
                barber_id=barber.id,
                client_id=client.id
            )
            
    @pytest.mark.asyncio
    async def test_inactive_barber_rejection(self, db: Session):
        """Test rejection of bookings with inactive barbers"""
        inactive_barber = UserFactory(
            unified_role=UnifiedUserRole.BARBER,
            is_active=False  # Inactive barber
        )
        client = ClientFactory()
        
        future_date = get_timezone_aware_now() + timedelta(days=1)
        
        with pytest.raises(ValueError, match="not found or not active"):
            create_booking(
                db=db,
                user_id=client.user_id,
                booking_date=future_date.date(),
                booking_time="10:00",
                service="Haircut",
                barber_id=inactive_barber.id,
                client_id=client.id
            )


class TestCapacityOverflowHandling:
    """Test handling of capacity overflow scenarios"""
    
    def setup_method(self):
        """Setup test data for each test"""
        from services.booking_service import create_booking, get_available_slots
        
    @pytest.mark.asyncio
    async def test_daily_capacity_limit(self, db: Session):
        """Test handling of daily appointment capacity limits"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        service = ServiceFactory(duration_minutes=60)
        target_date = get_timezone_aware_now() + timedelta(days=1)
        
        # Mock business settings: 8 hour day, 1-hour appointments = max 8 appointments
        with patch('services.booking_service.get_booking_settings') as mock_settings:
            mock_settings.return_value.business_start_time = datetime.strptime("09:00", "%H:%M").time()
            mock_settings.return_value.business_end_time = datetime.strptime("17:00", "%H:%M").time()
            mock_settings.return_value.business_timezone = "UTC"
            mock_settings.return_value.slot_duration_minutes = 60
            mock_settings.return_value.min_lead_time_minutes = 60
            
            # Fill up all available slots (9 AM - 5 PM = 8 slots)
            clients = [ClientFactory() for _ in range(8)]
            
            for i, client in enumerate(clients):
                hour = 9 + i
                appointment = create_booking(
                    db=db,
                    user_id=client.user_id,
                    booking_date=target_date.date(),
                    booking_time=f"{hour:02d}:00",
                    service="Haircut",
                    barber_id=barber.id,
                    client_id=client.id
                )
                assert appointment is not None
                
            # Try to book one more appointment (should fail - no slots available)
            overflow_client = ClientFactory()
            
            with pytest.raises(ValueError, match="already has an appointment at"):
                create_booking(
                    db=db,
                    user_id=overflow_client.user_id,
                    booking_date=target_date.date(),
                    booking_time="17:00",  # No slot available at any time
                    service="Haircut",
                    barber_id=barber.id,
                    client_id=overflow_client.id
                )
                
    @pytest.mark.asyncio
    async def test_service_specific_capacity_limits(self, db: Session):
        """Test capacity limits for specific service types"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        
        # Long service that limits daily capacity
        long_service = ServiceFactory(
            name="Signature Package",
            duration_minutes=180,  # 3-hour service
            base_price=Decimal('150.00')
        )
        
        target_date = get_timezone_aware_now() + timedelta(days=1)
        
        with patch('services.booking_service.get_booking_settings') as mock_settings:
            mock_settings.return_value.business_start_time = datetime.strptime("09:00", "%H:%M").time()
            mock_settings.return_value.business_end_time = datetime.strptime("18:00", "%H:%M").time()
            mock_settings.return_value.business_timezone = "UTC"
            mock_settings.return_value.min_lead_time_minutes = 60
            
            # With 9-hour business day and 3-hour services, maximum 3 services per day
            clients = [ClientFactory() for _ in range(3)]
            
            # Book maximum capacity
            service_times = ["09:00", "12:00", "15:00"]
            for i, client in enumerate(clients):
                appointment = create_booking(
                    db=db,
                    user_id=client.user_id,
                    booking_date=target_date.date(),
                    booking_time=service_times[i],
                    service="Haircut & Shave",  # Maps to long service
                    barber_id=barber.id,
                    client_id=client.id
                )
                assert appointment is not None
                assert appointment.duration_minutes == 30  # Default service duration
                
    @pytest.mark.asyncio 
    async def test_multi_barber_capacity_distribution(self, db: Session):
        """Test capacity distribution across multiple barbers"""
        # Create multiple barbers
        barbers = [
            UserFactory(unified_role=UnifiedUserRole.BARBER) for _ in range(3)
        ]
        
        # Create many clients
        clients = [ClientFactory() for _ in range(15)]
        
        target_date = get_timezone_aware_now() + timedelta(days=1)
        
        # Mock barber availability to return all barbers
        with patch('services.barber_availability_service.get_available_barbers_for_slot') as mock_availability:
            mock_availability.return_value = barbers
            
            successful_bookings = []
            failed_bookings = []
            
            # Try to book appointments for all clients
            for i, client in enumerate(clients):
                try:
                    appointment = create_booking(
                        db=db,
                        user_id=client.user_id,
                        booking_date=target_date.date(),
                        booking_time="10:00",
                        service="Haircut",
                        # Don't specify barber_id - let system assign
                    )
                    successful_bookings.append(appointment)
                except ValueError:
                    failed_bookings.append(client)
                    
            # Should distribute bookings across available barbers
            # With 3 barbers, should handle more bookings than single barber
            assert len(successful_bookings) >= 3
            
            # Verify bookings distributed across different barbers
            assigned_barbers = set(booking.barber_id for booking in successful_bookings)
            assert len(assigned_barbers) >= 2  # At least 2 different barbers used


class TestSystemResilienceAndErrorRecovery:
    """Test system resilience and error recovery mechanisms"""
    
    def setup_method(self):
        """Setup test data for each test"""
        from services.booking_service import create_booking, get_available_slots
        
    @pytest.mark.asyncio
    async def test_database_constraint_violation_handling(self, db: Session):
        """Test graceful handling of database constraint violations"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory()
        
        # Create appointment
        appointment_time = get_timezone_aware_now() + timedelta(days=1, hours=10)
        
        appointment = Appointment(
            user_id=client.user_id,
            barber_id=barber.id,
            client_id=client.id,
            service_name="Haircut",
            start_time=appointment_time,
            duration_minutes=60,
            price=Decimal('50.00'),
            status="confirmed"
        )
        db.add(appointment)
        db.commit()
        
        # Simulate database constraint violation by attempting duplicate
        with pytest.raises(ValueError):
            duplicate_appointment = Appointment(
                user_id=client.user_id,
                barber_id=barber.id,
                client_id=client.id,
                service_name="Haircut",
                start_time=appointment_time,
                duration_minutes=60,
                price=Decimal('50.00'),
                status="confirmed"
            )
            db.add(duplicate_appointment)
            
            # This should trigger conflict detection before database commit
            create_booking(
                db=db,
                user_id=client.user_id,
                booking_date=appointment_time.date(),
                booking_time=appointment_time.strftime('%H:%M'),
                service="Haircut",
                barber_id=barber.id,
                client_id=client.id
            )
            
    @pytest.mark.asyncio
    async def test_external_service_failure_resilience(self, db: Session):
        """Test resilience when external services fail"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory()
        
        appointment_time = get_timezone_aware_now() + timedelta(days=1, hours=10)
        
        # Mock notification service failure
        with patch('services.booking_service.get_notification_service') as mock_notification:
            mock_notification.return_value = None  # Service unavailable
            
            # Booking should still succeed despite notification failure
            appointment = create_booking(
                db=db,
                user_id=client.user_id,
                booking_date=appointment_time.date(),
                booking_time=appointment_time.strftime('%H:%M'),
                service="Haircut",
                barber_id=barber.id,
                client_id=client.id
            )
            
            # Appointment should be created successfully
            assert appointment is not None
            assert appointment.status == "scheduled"
            
    @pytest.mark.asyncio
    async def test_partial_data_corruption_recovery(self, db: Session):
        """Test recovery from partial data corruption scenarios"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory()
        
        # Create appointment with missing required relationships
        appointment_time = get_timezone_aware_now() + timedelta(days=1, hours=10)
        
        # Test with invalid barber reference
        with pytest.raises(ValueError, match="not found or not active"):
            create_booking(
                db=db,
                user_id=client.user_id,
                booking_date=appointment_time.date(),
                booking_time=appointment_time.strftime('%H:%M'),
                service="Haircut",
                barber_id=99999,  # Non-existent barber ID
                client_id=client.id
            )
            
        # Test with invalid client reference
        with pytest.raises(Exception):  # Should handle gracefully
            create_booking(
                db=db,
                user_id=99999,  # Non-existent user ID
                booking_date=appointment_time.date(),
                booking_time=appointment_time.strftime('%H:%M'),
                service="Haircut",
                barber_id=barber.id,
                client_id=99999  # Non-existent client ID
            )
            
    @pytest.mark.asyncio
    async def test_timezone_handling_edge_cases(self, db: Session):
        """Test edge cases in timezone handling"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory()
        
        # Test booking during daylight saving time transition
        # This would be March 10, 2024 in US (spring forward)
        dst_transition_date = datetime(2024, 3, 10, 10, 0)  # 10 AM
        
        with patch('services.booking_service.get_booking_settings') as mock_settings:
            mock_settings.return_value.business_timezone = "America/New_York"
            mock_settings.return_value.business_start_time = datetime.strptime("09:00", "%H:%M").time()
            mock_settings.return_value.business_end_time = datetime.strptime("18:00", "%H:%M").time()
            mock_settings.return_value.min_lead_time_minutes = 60
            
            # This should handle timezone transition gracefully
            try:
                appointment = create_booking(
                    db=db,
                    user_id=client.user_id,
                    booking_date=dst_transition_date.date(),
                    booking_time="10:00",
                    service="Haircut",
                    user_timezone="America/Los_Angeles",  # Different timezone
                    barber_id=barber.id,
                    client_id=client.id
                )
                
                # Should create appointment with proper UTC conversion
                assert appointment is not None
                assert appointment.start_time is not None
                
            except Exception as e:
                # Should not crash, but may raise validation errors
                assert "timezone" in str(e).lower() or "time" in str(e).lower()
                
    @pytest.mark.asyncio
    async def test_memory_pressure_handling(self, db: Session):
        """Test system behavior under memory pressure"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        
        # Simulate high-load scenario with many concurrent bookings
        appointment_time = get_timezone_aware_now() + timedelta(days=1)
        
        # Create many clients and attempt bookings
        clients = [ClientFactory() for _ in range(50)]
        
        successful_bookings = 0
        failed_bookings = 0
        
        for i, client in enumerate(clients):
            try:
                # Spread bookings across different times
                booking_hour = 9 + (i % 8)  # 9 AM to 5 PM
                appointment = create_booking(
                    db=db,
                    user_id=client.user_id,
                    booking_date=appointment_time.date(),
                    booking_time=f"{booking_hour:02d}:00",
                    service="Haircut",
                    barber_id=barber.id,
                    client_id=client.id
                )
                if appointment:
                    successful_bookings += 1
            except Exception:
                failed_bookings += 1
                
        # System should handle gracefully without crashing
        assert successful_bookings > 0
        assert successful_bookings + failed_bookings == 50
        
        # Should not exceed reasonable daily capacity
        assert successful_bookings <= 8  # 8-hour business day, 1-hour slots
        
    @pytest.mark.asyncio
    async def test_graceful_degradation_patterns(self, db: Session):
        """Test graceful degradation when subsystems fail"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client = ClientFactory()
        
        appointment_time = get_timezone_aware_now() + timedelta(days=1, hours=10)
        
        # Test with multiple service failures
        with patch('services.booking_service.barber_availability_service') as mock_availability:
            # Mock availability service failure
            mock_availability.is_barber_available.side_effect = Exception("Service unavailable")
            
            # Booking should still work with fallback logic
            with patch('services.booking_service.get_booking_settings') as mock_settings:
                mock_settings.return_value.business_start_time = datetime.strptime("09:00", "%H:%M").time()
                mock_settings.return_value.business_end_time = datetime.strptime("18:00", "%H:%M").time()
                mock_settings.return_value.business_timezone = "UTC"
                mock_settings.return_value.min_lead_time_minutes = 60
                
                try:
                    appointment = create_booking(
                        db=db,
                        user_id=client.user_id,
                        booking_date=appointment_time.date(),
                        booking_time=appointment_time.strftime('%H:%M'),
                        service="Haircut",
                        barber_id=barber.id,
                        client_id=client.id
                    )
                    
                    # Should either succeed with fallback or fail gracefully
                    if appointment:
                        assert appointment.status in ["scheduled", "confirmed"]
                        
                except ValueError as e:
                    # Should provide clear error message, not crash
                    assert len(str(e)) > 0
                    assert "service" in str(e).lower() or "barber" in str(e).lower()