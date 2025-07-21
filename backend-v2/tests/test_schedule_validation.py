"""
Schedule Validation Tests
Tests comprehensive schedule validation including barber availability, 
business hours constraints, blackout dates, and booking conflicts.
"""

import pytest
from datetime import datetime, timedelta, date, time
from decimal import Decimal
from unittest.mock import patch, AsyncMock, MagicMock
from sqlalchemy.orm import Session

from models import (
    Appointment, User, Service, Organization, BarberAvailability,
    BlackoutDate, UnifiedUserRole
)
from services.booking_service import create_booking
from services.barber_availability_service import get_available_slots
from services.schedule_validation_service import ScheduleValidationService
from tests.factories import (
    UserFactory, ServiceFactory, AppointmentFactory, OrganizationFactory
)
from utils.timezone_utils import get_timezone_aware_now


class TestBarberAvailabilityValidation:
    """Test barber availability validation"""
    
    def setup_method(self):
        """Setup test data for each test"""
        from services.booking_service import create_booking, get_available_slots
        from services.barber_availability_service import get_available_slots
        self.schedule_service = ScheduleValidationService()
        
    @pytest.mark.asyncio
    async def test_barber_weekly_availability_schedule(self, db: Session):
        """Test barber weekly availability schedule validation"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        organization = OrganizationFactory()
        
        # Create weekly availability schedule
        # Monday: 9 AM - 5 PM
        # Tuesday: 10 AM - 6 PM  
        # Wednesday: Off
        # Thursday: 9 AM - 3 PM
        # Friday: 9 AM - 5 PM
        # Weekend: Off
        
        availability_schedule = [
            BarberAvailability(
                barber_id=barber.id,
                day_of_week=0,  # Monday
                start_time=time(9, 0),
                end_time=time(17, 0),
                is_available=True
            ),
            BarberAvailability(
                barber_id=barber.id,
                day_of_week=1,  # Tuesday
                start_time=time(10, 0),
                end_time=time(18, 0),
                is_available=True
            ),
            BarberAvailability(
                barber_id=barber.id,
                day_of_week=2,  # Wednesday
                is_available=False
            ),
            BarberAvailability(
                barber_id=barber.id,
                day_of_week=3,  # Thursday
                start_time=time(9, 0),
                end_time=time(15, 0),
                is_available=True
            ),
            BarberAvailability(
                barber_id=barber.id,
                day_of_week=4,  # Friday
                start_time=time(9, 0),
                end_time=time(17, 0),
                is_available=True
            )
        ]
        
        for avail in availability_schedule:
            db.add(avail)
        db.commit()
        
        # Test availability validation for different days
        next_monday = self._get_next_weekday(0)  # Monday
        next_tuesday = self._get_next_weekday(1)  # Tuesday
        next_wednesday = self._get_next_weekday(2)  # Wednesday
        next_thursday = self._get_next_weekday(3)  # Thursday
        next_friday = self._get_next_weekday(4)  # Friday
        next_saturday = self._get_next_weekday(5)  # Saturday
        
        # Monday 10 AM - should be available
        monday_available = get_available_slots(
            db=db,
            barber_id=barber.id,
            check_date=next_monday,
            start_time=time(10, 0),
            end_time=time(11, 0)
        )
        assert monday_available == True
        
        # Monday 6 PM - should not be available (after hours)
        monday_after_hours = get_available_slots(
            db=db,
            barber_id=barber.id,
            check_date=next_monday,
            start_time=time(18, 0),
            end_time=time(19, 0)
        )
        assert monday_after_hours == False
        
        # Tuesday 9 AM - should not be available (before hours)
        tuesday_before_hours = get_available_slots(
            db=db,
            barber_id=barber.id,
            check_date=next_tuesday,
            start_time=time(9, 0),
            end_time=time(10, 0)
        )
        assert tuesday_before_hours == False
        
        # Wednesday - should not be available (day off)
        wednesday_off = get_available_slots(
            db=db,
            barber_id=barber.id,
            check_date=next_wednesday,
            start_time=time(12, 0),
            end_time=time(13, 0)
        )
        assert wednesday_off == False
        
        # Thursday 2 PM - should be available
        thursday_available = get_available_slots(
            db=db,
            barber_id=barber.id,
            check_date=next_thursday,
            start_time=time(14, 0),
            end_time=time(15, 0)
        )
        assert thursday_available == True
        
        # Thursday 4 PM - should not be available (after hours)
        thursday_after_hours = get_available_slots(
            db=db,
            barber_id=barber.id,
            check_date=next_thursday,
            start_time=time(16, 0),
            end_time=time(17, 0)
        )
        assert thursday_after_hours == False
        
        # Saturday - should not be available (no availability set)
        saturday_off = get_available_slots(
            db=db,
            barber_id=barber.id,
            check_date=next_saturday,
            start_time=time(10, 0),
            end_time=time(11, 0)
        )
        assert saturday_off == False
        
    @pytest.mark.asyncio
    async def test_barber_lunch_break_availability(self, db: Session):
        """Test barber availability with lunch breaks"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        
        # Create availability with lunch break
        # Monday: 9 AM - 12 PM, 1 PM - 5 PM (lunch break 12-1 PM)
        morning_availability = BarberAvailability(
            barber_id=barber.id,
            day_of_week=0,  # Monday
            start_time=time(9, 0),
            end_time=time(12, 0),  # Morning session
            is_available=True
        )
        
        afternoon_availability = BarberAvailability(
            barber_id=barber.id,
            day_of_week=0,  # Monday
            start_time=time(13, 0),  # After lunch
            end_time=time(17, 0),
            is_available=True
        )
        
        db.add(morning_availability)
        db.add(afternoon_availability)
        db.commit()
        
        next_monday = self._get_next_weekday(0)
        
        # Morning slot - should be available
        morning_available = get_available_slots(
            db=db,
            barber_id=barber.id,
            check_date=next_monday,
            start_time=time(10, 0),
            end_time=time(11, 0)
        )
        assert morning_available == True
        
        # Lunch time - should not be available
        lunch_unavailable = get_available_slots(
            db=db,
            barber_id=barber.id,
            check_date=next_monday,
            start_time=time(12, 30),
            end_time=time(13, 30)
        )
        assert lunch_unavailable == False
        
        # Afternoon slot - should be available
        afternoon_available = get_available_slots(
            db=db,
            barber_id=barber.id,
            check_date=next_monday,
            start_time=time(14, 0),
            end_time=time(15, 0)
        )
        assert afternoon_available == True
        
    @pytest.mark.asyncio
    async def test_multiple_barber_availability_slots(self, db: Session):
        """Test getting available barbers for specific time slots"""
        # Create multiple barbers with different schedules
        barber1 = UserFactory(unified_role=UnifiedUserRole.BARBER)
        barber2 = UserFactory(unified_role=UnifiedUserRole.BARBER)
        barber3 = UserFactory(unified_role=UnifiedUserRole.BARBER)
        
        # Barber 1: Available Monday 9-5
        availability1 = BarberAvailability(
            barber_id=barber1.id,
            day_of_week=0,
            start_time=time(9, 0),
            end_time=time(17, 0),
            is_available=True
        )
        
        # Barber 2: Available Monday 10-6
        availability2 = BarberAvailability(
            barber_id=barber2.id,
            day_of_week=0,
            start_time=time(10, 0),
            end_time=time(18, 0),
            is_available=True
        )
        
        # Barber 3: Not available Monday
        availability3 = BarberAvailability(
            barber_id=barber3.id,
            day_of_week=0,
            is_available=False
        )
        
        db.add_all([availability1, availability2, availability3])
        db.commit()
        
        next_monday = self._get_next_weekday(0)
        
        # Test different time slots
        # 9:30 AM - only barber1 available
        available_930 = self.availability_service.get_available_barbers_for_slot(
            db=db,
            check_date=next_monday,
            start_time=time(9, 30),
            end_time=time(10, 30)
        )
        assert len(available_930) == 1
        assert available_930[0].id == barber1.id
        
        # 11 AM - both barber1 and barber2 available
        available_11 = self.availability_service.get_available_barbers_for_slot(
            db=db,
            check_date=next_monday,
            start_time=time(11, 0),
            end_time=time(12, 0)
        )
        assert len(available_11) == 2
        barber_ids = {barber.id for barber in available_11}
        assert barber1.id in barber_ids
        assert barber2.id in barber_ids
        
        # 5:30 PM - only barber2 available
        available_530 = self.availability_service.get_available_barbers_for_slot(
            db=db,
            check_date=next_monday,
            start_time=time(17, 30),
            end_time=time(18, 30)
        )
        assert len(available_530) == 1
        assert available_530[0].id == barber2.id
        
        # 7 PM - no barbers available
        available_7 = self.availability_service.get_available_barbers_for_slot(
            db=db,
            check_date=next_monday,
            start_time=time(19, 0),
            end_time=time(20, 0)
        )
        assert len(available_7) == 0
        
    def _get_next_weekday(self, weekday):
        """Helper to get next occurrence of a specific weekday"""
        today = date.today()
        days_ahead = weekday - today.weekday()
        if days_ahead <= 0:  # Target day already happened this week
            days_ahead += 7
        return today + timedelta(days_ahead)


class TestBusinessHoursValidation:
    """Test business hours validation"""
    
    def setup_method(self):
        """Setup test data for each test"""
        from services.booking_service import create_booking, get_available_slots
        self.schedule_service = ScheduleValidationService()
        
    @pytest.mark.asyncio
    async def test_standard_business_hours_validation(self, db: Session):
        """Test validation against standard business hours"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        service = ServiceFactory(duration_minutes=60)
        
        # Mock business settings: 9 AM - 6 PM
        with patch('services.booking_service.get_booking_settings') as mock_settings:
            mock_settings.return_value.business_start_time = time(9, 0)
            mock_settings.return_value.business_end_time = time(18, 0)
            mock_settings.return_value.business_timezone = "UTC"
            mock_settings.return_value.min_lead_time_minutes = 60
            
            future_date = get_timezone_aware_now() + timedelta(days=1)
            
            # Test valid times within business hours
            valid_times = ["09:00", "12:00", "15:00", "17:00"]  # Last appointment starts at 5 PM
            
            for valid_time in valid_times:
                is_valid = self.schedule_service.validate_business_hours(
                    booking_date=future_date.date(),
                    booking_time=valid_time,
                    service_duration=60
                )
                assert is_valid == True, f"Time {valid_time} should be valid"
                
            # Test invalid times outside business hours
            invalid_times = ["08:00", "18:00", "19:00", "22:00"]
            
            for invalid_time in invalid_times:
                is_valid = self.schedule_service.validate_business_hours(
                    booking_date=future_date.date(),
                    booking_time=invalid_time,
                    service_duration=60
                )
                assert is_valid == False, f"Time {invalid_time} should be invalid"
                
    @pytest.mark.asyncio
    async def test_service_duration_business_hours_validation(self, db: Session):
        """Test business hours validation considering service duration"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        
        with patch('services.booking_service.get_booking_settings') as mock_settings:
            mock_settings.return_value.business_start_time = time(9, 0)
            mock_settings.return_value.business_end_time = time(18, 0)  # 6 PM close
            mock_settings.return_value.business_timezone = "UTC"
            
            future_date = get_timezone_aware_now() + timedelta(days=1)
            
            # Test different service durations
            test_scenarios = [
                # (start_time, duration, should_be_valid)
                ("16:00", 60, True),   # 4 PM start, 1 hour = ends at 5 PM (valid)
                ("17:00", 60, True),   # 5 PM start, 1 hour = ends at 6 PM (valid - ends exactly at close)
                ("17:30", 60, False),  # 5:30 PM start, 1 hour = ends at 6:30 PM (invalid)
                ("15:00", 180, True),  # 3 PM start, 3 hours = ends at 6 PM (valid)
                ("15:30", 180, False), # 3:30 PM start, 3 hours = ends at 6:30 PM (invalid)
                ("09:00", 540, True),  # 9 AM start, 9 hours = ends at 6 PM (valid - full day)
                ("09:30", 540, False), # 9:30 AM start, 9 hours = ends at 6:30 PM (invalid)
            ]
            
            for start_time, duration, should_be_valid in test_scenarios:
                is_valid = self.schedule_service.validate_business_hours(
                    booking_date=future_date.date(),
                    booking_time=start_time,
                    service_duration=duration
                )
                assert is_valid == should_be_valid, f"Start time {start_time} with {duration}min duration should be {'valid' if should_be_valid else 'invalid'}"
                
    @pytest.mark.asyncio
    async def test_different_timezone_business_hours(self, db: Session):
        """Test business hours validation across different timezones"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        
        # Business operates in Eastern Time (ET)
        with patch('services.booking_service.get_booking_settings') as mock_settings:
            mock_settings.return_value.business_start_time = time(9, 0)   # 9 AM ET
            mock_settings.return_value.business_end_time = time(18, 0)    # 6 PM ET
            mock_settings.return_value.business_timezone = "America/New_York"
            
            future_date = get_timezone_aware_now() + timedelta(days=1)
            
            # Client booking from Pacific Time (PT) - 3 hours behind ET
            # When client says "2 PM PT", that's 5 PM ET
            
            test_scenarios = [
                # (client_timezone, client_time, should_be_valid, description)
                ("America/Los_Angeles", "09:00", True, "12 PM ET - valid"),
                ("America/Los_Angeles", "15:00", True, "6 PM ET - valid (ends at close)"),
                ("America/Los_Angeles", "15:30", False, "6:30 PM ET - invalid (after close)"),
                ("America/Chicago", "08:00", True, "9 AM ET - valid (start of business)"),
                ("America/Chicago", "17:00", True, "6 PM ET - valid (ends at close)"),
                ("America/Chicago", "17:30", False, "6:30 PM ET - invalid (after close)"),
            ]
            
            for client_timezone, client_time, should_be_valid, description in test_scenarios:
                is_valid = self.schedule_service.validate_business_hours_with_timezone(
                    booking_date=future_date.date(),
                    booking_time=client_time,
                    service_duration=60,
                    client_timezone=client_timezone
                )
                assert is_valid == should_be_valid, f"{description}: {client_time} {client_timezone}"
                
    @pytest.mark.asyncio
    async def test_weekend_business_hours_override(self, db: Session):
        """Test different business hours for weekends"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        
        # Mock weekend business hours (Saturday different from weekday)
        with patch('services.booking_service.get_booking_settings') as mock_settings:
            mock_settings.return_value.business_start_time = time(9, 0)
            mock_settings.return_value.business_end_time = time(18, 0)
            mock_settings.return_value.business_timezone = "UTC"
            mock_settings.return_value.weekend_hours = {
                "saturday": {"start": time(10, 0), "end": time(16, 0)},  # 10 AM - 4 PM Saturday
                "sunday": {"closed": True}  # Closed Sunday
            }
            
            # Get next Saturday and Sunday
            next_saturday = self._get_next_weekday(5)  # Saturday
            next_sunday = self._get_next_weekday(6)    # Sunday
            
            # Test Saturday hours (10 AM - 4 PM)
            saturday_valid = self.schedule_service.validate_business_hours(
                booking_date=next_saturday,
                booking_time="11:00",
                service_duration=60
            )
            assert saturday_valid == True
            
            saturday_invalid_early = self.schedule_service.validate_business_hours(
                booking_date=next_saturday,
                booking_time="09:00",
                service_duration=60
            )
            assert saturday_invalid_early == False
            
            saturday_invalid_late = self.schedule_service.validate_business_hours(
                booking_date=next_saturday,
                booking_time="15:30",
                service_duration=60
            )
            assert saturday_invalid_late == False
            
            # Test Sunday (closed)
            sunday_invalid = self.schedule_service.validate_business_hours(
                booking_date=next_sunday,
                booking_time="12:00",
                service_duration=60
            )
            assert sunday_invalid == False
            
    def _get_next_weekday(self, weekday):
        """Helper to get next occurrence of a specific weekday"""
        today = date.today()
        days_ahead = weekday - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        return today + timedelta(days_ahead)


class TestBlackoutDateHandling:
    """Test blackout date handling and validation"""
    
    def setup_method(self):
        """Setup test data for each test"""
        from services.booking_service import create_booking, get_available_slots
        self.schedule_service = ScheduleValidationService()
        
    @pytest.mark.asyncio
    async def test_single_blackout_date_validation(self, db: Session):
        """Test validation against single blackout dates"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        organization = OrganizationFactory()
        
        # Create blackout date (barber vacation day)
        vacation_date = get_timezone_aware_now().date() + timedelta(days=7)
        
        blackout = BlackoutDate(
            barber_id=barber.id,
            organization_id=organization.id,
            date=vacation_date,
            reason="Personal vacation",
            is_recurring=False,
            created_by=barber.id
        )
        db.add(blackout)
        db.commit()
        
        # Test booking attempt on blackout date
        is_available = self.schedule_service.validate_blackout_dates(
            barber_id=barber.id,
            booking_date=vacation_date,
            organization_id=organization.id
        )
        assert is_available == False
        
        # Test booking on day before (should be available)
        day_before = vacation_date - timedelta(days=1)
        is_available_before = self.schedule_service.validate_blackout_dates(
            barber_id=barber.id,
            booking_date=day_before,
            organization_id=organization.id
        )
        assert is_available_before == True
        
        # Test booking on day after (should be available)
        day_after = vacation_date + timedelta(days=1)
        is_available_after = self.schedule_service.validate_blackout_dates(
            barber_id=barber.id,
            booking_date=day_after,
            organization_id=organization.id
        )
        assert is_available_after == True
        
    @pytest.mark.asyncio
    async def test_date_range_blackout_validation(self, db: Session):
        """Test validation against blackout date ranges"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        organization = OrganizationFactory()
        
        # Create vacation range: 5 days off
        start_date = get_timezone_aware_now().date() + timedelta(days=10)
        end_date = start_date + timedelta(days=4)  # 5-day vacation
        
        blackout_range = BlackoutDate(
            barber_id=barber.id,
            organization_id=organization.id,
            date=start_date,
            end_date=end_date,
            reason="Extended vacation",
            is_recurring=False,
            created_by=barber.id
        )
        db.add(blackout_range)
        db.commit()
        
        # Test each day in the range
        current_date = start_date
        while current_date <= end_date:
            is_available = self.schedule_service.validate_blackout_dates(
                barber_id=barber.id,
                booking_date=current_date,
                organization_id=organization.id
            )
            assert is_available == False, f"Date {current_date} should be blacked out"
            current_date += timedelta(days=1)
            
        # Test days outside the range
        day_before_range = start_date - timedelta(days=1)
        is_available_before = self.schedule_service.validate_blackout_dates(
            barber_id=barber.id,
            booking_date=day_before_range,
            organization_id=organization.id
        )
        assert is_available_before == True
        
        day_after_range = end_date + timedelta(days=1)
        is_available_after = self.schedule_service.validate_blackout_dates(
            barber_id=barber.id,
            booking_date=day_after_range,
            organization_id=organization.id
        )
        assert is_available_after == True
        
    @pytest.mark.asyncio
    async def test_recurring_blackout_validation(self, db: Session):
        """Test validation against recurring blackout dates"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        organization = OrganizationFactory()
        
        # Create recurring blackout (every Monday off)
        base_date = self._get_next_weekday(0)  # Next Monday
        
        recurring_blackout = BlackoutDate(
            barber_id=barber.id,
            organization_id=organization.id,
            date=base_date,
            reason="Weekly day off",
            is_recurring=True,
            recurrence_pattern="weekly",
            recurrence_interval=1,  # Every week
            created_by=barber.id
        )
        db.add(recurring_blackout)
        db.commit()
        
        # Test multiple Mondays
        test_mondays = [
            base_date,
            base_date + timedelta(weeks=1),
            base_date + timedelta(weeks=2),
            base_date + timedelta(weeks=4)
        ]
        
        for monday in test_mondays:
            is_available = self.schedule_service.validate_blackout_dates(
                barber_id=barber.id,
                booking_date=monday,
                organization_id=organization.id
            )
            assert is_available == False, f"Monday {monday} should be recurring blackout"
            
        # Test other days of the week (should be available)
        tuesday = base_date + timedelta(days=1)
        is_available_tuesday = self.schedule_service.validate_blackout_dates(
            barber_id=barber.id,
            booking_date=tuesday,
            organization_id=organization.id
        )
        assert is_available_tuesday == True
        
    @pytest.mark.asyncio
    async def test_organization_wide_blackout_validation(self, db: Session):
        """Test validation against organization-wide blackout dates"""
        barber1 = UserFactory(unified_role=UnifiedUserRole.BARBER)
        barber2 = UserFactory(unified_role=UnifiedUserRole.BARBER)
        organization = OrganizationFactory()
        
        # Create organization-wide holiday
        holiday_date = get_timezone_aware_now().date() + timedelta(days=14)
        
        org_blackout = BlackoutDate(
            barber_id=None,  # Organization-wide (not specific barber)
            organization_id=organization.id,
            date=holiday_date,
            reason="Holiday closure",
            is_recurring=False,
            created_by=barber1.id
        )
        db.add(org_blackout)
        db.commit()
        
        # Test both barbers affected by organization blackout
        for barber in [barber1, barber2]:
            is_available = self.schedule_service.validate_blackout_dates(
                barber_id=barber.id,
                booking_date=holiday_date,
                organization_id=organization.id
            )
            assert is_available == False, f"Barber {barber.id} should be affected by org blackout"
            
    @pytest.mark.asyncio
    async def test_overlapping_blackout_handling(self, db: Session):
        """Test handling of overlapping blackout dates"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        organization = OrganizationFactory()
        
        base_date = get_timezone_aware_now().date() + timedelta(days=20)
        
        # Create overlapping blackouts
        # Personal vacation: 5 days
        personal_blackout = BlackoutDate(
            barber_id=barber.id,
            organization_id=organization.id,
            date=base_date,
            end_date=base_date + timedelta(days=4),
            reason="Personal vacation",
            is_recurring=False,
            created_by=barber.id
        )
        
        # Organization holiday: overlapping in the middle
        org_blackout = BlackoutDate(
            barber_id=None,
            organization_id=organization.id,
            date=base_date + timedelta(days=2),
            end_date=base_date + timedelta(days=3),
            reason="Holiday",
            is_recurring=False,
            created_by=barber.id
        )
        
        db.add_all([personal_blackout, org_blackout])
        db.commit()
        
        # Test entire overlapping period
        for days_offset in range(5):  # Days 0-4
            test_date = base_date + timedelta(days=days_offset)
            is_available = self.schedule_service.validate_blackout_dates(
                barber_id=barber.id,
                booking_date=test_date,
                organization_id=organization.id
            )
            assert is_available == False, f"Day {days_offset} should be blacked out"
            
        # Get blackout details
        blackout_info = self.schedule_service.get_blackout_details(
            barber_id=barber.id,
            booking_date=base_date + timedelta(days=2),  # Overlapping day
            organization_id=organization.id
        )
        
        # Should show both blackouts affecting this date
        assert len(blackout_info["active_blackouts"]) >= 1
        
    def _get_next_weekday(self, weekday):
        """Helper to get next occurrence of a specific weekday"""
        today = date.today()
        days_ahead = weekday - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        return today + timedelta(days_ahead)


class TestBookingConflictValidation:
    """Test booking conflict detection and validation"""
    
    def setup_method(self):
        """Setup test data for each test"""
        from services.booking_service import create_booking, get_available_slots
        self.schedule_service = ScheduleValidationService()
        
    @pytest.mark.asyncio
    async def test_appointment_conflict_detection(self, db: Session):
        """Test comprehensive appointment conflict detection"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client1 = ClientFactory()
        client2 = ClientFactory()
        service = ServiceFactory(duration_minutes=90)
        
        # Create existing appointment: 2 PM - 3:30 PM
        base_time = get_timezone_aware_now() + timedelta(days=1, hours=14)
        
        existing_appointment = AppointmentFactory(
            barber_id=barber.id,
            client_id=client1.id,
            start_time=base_time,
            duration_minutes=90,
            status="confirmed"
        )
        db.add(existing_appointment)
        db.commit()
        
        # Test various conflict scenarios
        conflict_scenarios = [
            # (start_time_offset_minutes, duration, should_conflict, description)
            (-30, 60, True, "Starts before, ends during existing"),
            (0, 90, True, "Exact same time and duration"),
            (30, 60, True, "Starts during existing"),
            (45, 90, True, "Starts during, ends after existing"),
            (90, 60, False, "Starts exactly when existing ends (no conflict)"),
            (-120, 60, False, "Completely before existing (no conflict)"),
            (150, 60, False, "Completely after existing (no conflict)"),
        ]
        
        for offset, duration, should_conflict, description in conflict_scenarios:
            test_time = base_time + timedelta(minutes=offset)
            
            conflicts = self.schedule_service.detect_appointment_conflicts(
                db=db,
                barber_id=barber.id,
                start_time=test_time,
                duration_minutes=duration,
                exclude_appointment_id=None
            )
            
            has_conflict = len(conflicts) > 0
            assert has_conflict == should_conflict, f"{description}: offset {offset}min, duration {duration}min"
            
    @pytest.mark.asyncio
    async def test_buffer_time_conflict_detection(self, db: Session):
        """Test conflict detection including buffer times"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client1 = ClientFactory()
        client2 = ClientFactory()
        
        # Create appointment with buffer times: 2 PM - 3 PM + 15min before/after
        base_time = get_timezone_aware_now() + timedelta(days=1, hours=14)
        
        existing_appointment = AppointmentFactory(
            barber_id=barber.id,
            client_id=client1.id,
            start_time=base_time,
            duration_minutes=60,
            buffer_time_before=15,
            buffer_time_after=15,
            status="confirmed"
        )
        db.add(existing_appointment)
        db.commit()
        
        # Test buffer time conflicts
        buffer_scenarios = [
            # (start_time_offset_minutes, should_conflict, description)
            (-10, True, "Overlaps with before-buffer"),
            (-15, True, "Starts exactly at before-buffer"),
            (-20, False, "Before the before-buffer"),
            (65, True, "Overlaps with after-buffer"),
            (75, True, "Starts exactly at after-buffer end"),
            (80, False, "After the after-buffer"),
        ]
        
        for offset, should_conflict, description in buffer_scenarios:
            test_time = base_time + timedelta(minutes=offset)
            
            conflicts = self.schedule_service.detect_appointment_conflicts(
                db=db,
                barber_id=barber.id,
                start_time=test_time,
                duration_minutes=60,
                include_buffer_times=True
            )
            
            has_conflict = len(conflicts) > 0
            assert has_conflict == should_conflict, f"{description}: offset {offset}min"
            
    @pytest.mark.asyncio
    async def test_multi_appointment_conflict_detection(self, db: Session):
        """Test conflict detection with multiple existing appointments"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        clients = [ClientFactory() for _ in range(4)]
        
        base_time = get_timezone_aware_now() + timedelta(days=1, hours=9)
        
        # Create multiple appointments throughout the day
        # 9-10 AM, 11-12 PM, 2-3 PM, 4-5 PM
        appointment_times = [
            (base_time, 60),  # 9 AM
            (base_time + timedelta(hours=2), 60),  # 11 AM
            (base_time + timedelta(hours=5), 60),  # 2 PM
            (base_time + timedelta(hours=7), 60),  # 4 PM
        ]
        
        existing_appointments = []
        for i, (start_time, duration) in enumerate(appointment_times):
            appointment = AppointmentFactory(
                barber_id=barber.id,
                client_id=clients[i].id,
                start_time=start_time,
                duration_minutes=duration,
                status="confirmed"
            )
            existing_appointments.append(appointment)
            db.add(appointment)
            
        db.commit()
        
        # Test slot between appointments (should be available)
        # 12:30 PM - 1:30 PM (between 11-12 and 2-3 appointments)
        available_slot_time = base_time + timedelta(hours=3, minutes=30)
        
        conflicts = self.schedule_service.detect_appointment_conflicts(
            db=db,
            barber_id=barber.id,
            start_time=available_slot_time,
            duration_minutes=60
        )
        assert len(conflicts) == 0, "Slot between appointments should be available"
        
        # Test overlapping with multiple appointments
        # 10:30 AM - 12:30 PM (overlaps with both 11-12 appointment and potentially others)
        overlapping_time = base_time + timedelta(hours=1, minutes=30)
        
        conflicts_multiple = self.schedule_service.detect_appointment_conflicts(
            db=db,
            barber_id=barber.id,
            start_time=overlapping_time,
            duration_minutes=120  # 2-hour appointment
        )
        assert len(conflicts_multiple) >= 1, "Should detect conflict with 11-12 appointment"
        
    @pytest.mark.asyncio
    async def test_conflict_resolution_suggestions(self, db: Session):
        """Test generation of conflict resolution suggestions"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client1 = ClientFactory()
        client2 = ClientFactory()
        
        # Create existing appointment: 2 PM - 3 PM
        base_time = get_timezone_aware_now() + timedelta(days=1, hours=14)
        
        existing_appointment = AppointmentFactory(
            barber_id=barber.id,
            client_id=client1.id,
            start_time=base_time,
            duration_minutes=60,
            status="confirmed"
        )
        db.add(existing_appointment)
        db.commit()
        
        # Try to book conflicting appointment: 2:30 PM - 3:30 PM
        conflict_time = base_time + timedelta(minutes=30)
        
        resolution_suggestions = self.schedule_service.generate_conflict_resolution_suggestions(
            db=db,
            barber_id=barber.id,
            desired_start_time=conflict_time,
            service_duration=60,
            preferred_date=conflict_time.date()
        )
        
        # Should suggest alternative times
        assert "alternative_slots" in resolution_suggestions
        assert len(resolution_suggestions["alternative_slots"]) > 0
        
        alternatives = resolution_suggestions["alternative_slots"]
        
        # Verify suggestions are actually available
        for alternative in alternatives[:3]:  # Check first 3 suggestions
            alt_conflicts = self.schedule_service.detect_appointment_conflicts(
                db=db,
                barber_id=barber.id,
                start_time=alternative["start_time"],
                duration_minutes=60
            )
            assert len(alt_conflicts) == 0, f"Alternative {alternative['start_time']} should not have conflicts"
            
        # Should include reschedule options if applicable
        assert "reschedule_options" in resolution_suggestions
        
        # Should provide conflict details
        assert "conflict_details" in resolution_suggestions
        conflict_details = resolution_suggestions["conflict_details"]
        assert conflict_details["conflicting_appointment_id"] == existing_appointment.id
        assert conflict_details["conflict_type"] in ["overlap", "adjacent", "within"]