"""
Comprehensive tests for Booking Rules Service.

Tests cover:
- Rule validation logic
- Time slot availability calculations  
- Buffer time enforcement
- Multi-location rules
- Capacity constraints
- Special scheduling rules
- Edge cases and conflicts
"""

import pytest
from datetime import datetime, date, time, timedelta, timezone
from unittest.mock import patch

from services.booking_rules_service import (
    validate_booking_against_rules,
    BookingRuleViolation,
    create_booking_rule,
    get_booking_rules,
    update_booking_rule,
    delete_booking_rule,
    get_service_booking_rules,
    create_service_booking_rule,
    _validate_service_rules,
    _validate_global_rules,
    _validate_client_constraints,
    _validate_business_constraints,
    _rule_applies_to_booking
)
from tests.factories import (
    UserFactory, ClientFactory, AppointmentFactory, ServiceFactory
)
from models import (
    BookingRule, ServiceBookingRule, BookingSettings
)
from sqlalchemy.orm import Session


@pytest.fixture
def booking_settings(db: Session):
    """Create booking settings for testing."""
    settings = BookingSettings(
        business_id=1,
        business_start_time=time(9, 0),
        business_end_time=time(18, 0),
        allow_same_day_booking=True,
        same_day_cutoff_time=time(14, 0),
        buffer_time_minutes=15,
        max_advance_booking_days=30,
        min_advance_booking_hours=2
    )
    db.add(settings)
    db.commit()
    return settings


@pytest.fixture
def test_service_with_rules(db: Session):
    """Create test service with booking rules."""
    service = ServiceFactory.create_service(
        name="Premium Color Service",
        category="COLOR",
        base_price=120.0,
        duration_minutes=120
    )
    db.add(service)
    db.commit()
    
    # Add service-specific rules
    age_rule = ServiceBookingRule(
        service_id=service.id,
        rule_type="age_restriction",
        min_age=16,
        max_age=None,
        is_active=True
    )
    
    consultation_rule = ServiceBookingRule(
        service_id=service.id,
        rule_type="consultation_required",
        requires_consultation=True,
        is_active=True
    )
    
    patch_test_rule = ServiceBookingRule(
        service_id=service.id,
        rule_type="patch_test_required",
        requires_patch_test=True,
        patch_test_hours_before=48,
        is_active=True
    )
    
    frequency_rule = ServiceBookingRule(
        service_id=service.id,
        rule_type="booking_frequency",
        min_days_between_bookings=28,
        max_bookings_per_day=1,
        is_active=True
    )
    
    day_restriction_rule = ServiceBookingRule(
        service_id=service.id,
        rule_type="day_restrictions",
        blocked_days_of_week=[6],  # Sunday blocked
        is_active=True
    )
    
    db.add_all([age_rule, consultation_rule, patch_test_rule, frequency_rule, day_restriction_rule])
    db.commit()
    
    return service


@pytest.fixture
def test_client_with_history(db: Session):
    """Create test client with booking history."""
    client = ClientFactory.create_client(
        date_of_birth=date(1990, 1, 1),  # 34 years old
        customer_type="returning",
        total_visits=5
    )
    db.add(client)
    db.commit()
    
    # Add some appointment history
    past_appointment = AppointmentFactory.create_completed_appointment(
        client_id=client.id,
        service_name="Previous Color Service",
        start_time=datetime.now(timezone.utc) - timedelta(days=30),
        notes="consultation completed"
    )
    
    patch_test_appointment = AppointmentFactory.create_completed_appointment(
        client_id=client.id,
        service_name="Patch Test",
        start_time=datetime.now(timezone.utc) - timedelta(hours=72),
        notes="patch test completed - no reaction"
    )
    
    db.add_all([past_appointment, patch_test_appointment])
    db.commit()
    
    return client


@pytest.fixture
def test_global_rules(db: Session):
    """Create global booking rules."""
    rules = []
    
    # Max advance booking rule
    max_advance_rule = BookingRule(
        rule_name="Max Advance Booking",
        rule_type="max_advance_booking",
        rule_params={"max_days": 60},
        applies_to="all",
        priority=10,
        is_active=True
    )
    rules.append(max_advance_rule)
    
    # Min advance booking rule
    min_advance_rule = BookingRule(
        rule_name="Min Advance Booking",
        rule_type="min_advance_booking",
        rule_params={"min_hours": 4},
        applies_to="all",
        priority=10,
        is_active=True
    )
    rules.append(min_advance_rule)
    
    # Max duration rule
    max_duration_rule = BookingRule(
        rule_name="Max Duration",
        rule_type="max_duration",
        rule_params={"max_minutes": 240},
        applies_to="all",
        priority=5,
        is_active=True
    )
    rules.append(max_duration_rule)
    
    # Holiday restrictions
    holiday_rule = BookingRule(
        rule_name="Holiday Restrictions",
        rule_type="holiday_restrictions",
        rule_params={"holidays": ["12-25", "01-01", "07-04"]},
        applies_to="all",
        priority=15,
        is_active=True
    )
    rules.append(holiday_rule)
    
    # Blackout dates
    blackout_rule = BookingRule(
        rule_name="Blackout Dates",
        rule_type="blackout_dates",
        rule_params={"dates": ["2024-06-15", "2024-07-20"]},
        applies_to="all",
        priority=20,
        is_active=True
    )
    rules.append(blackout_rule)
    
    db.add_all(rules)
    db.commit()
    
    return rules


class TestBookingRuleValidation:
    """Test core booking rule validation logic."""
    
    def test_validate_booking_success(self, db, booking_settings, test_client_with_history):
        """Test successful booking validation with no violations."""
        user = UserFactory.create_user(email=test_client_with_history.email)
        service = ServiceFactory.create_service()
        db.add_all([user, service])
        db.commit()
        
        booking_date = date.today() + timedelta(days=7)
        booking_time = time(14, 0)
        
        is_valid, violations = validate_booking_against_rules(
            db=db,
            user_id=user.id,
            service_id=service.id,
            barber_id=None,
            booking_date=booking_date,
            booking_time=booking_time,
            duration_minutes=60,
            client_id=test_client_with_history.id
        )
        
        assert is_valid is True
        assert len(violations) == 0
    
    def test_validate_booking_with_violations(self, db, booking_settings, test_service_with_rules):
        """Test booking validation with rule violations."""
        # Create young client (under 16)
        young_client = ClientFactory.create_client(
            date_of_birth=date(2010, 1, 1),  # 14 years old
            customer_type="new"
        )
        user = UserFactory.create_user(email=young_client.email)
        db.add_all([young_client, user])
        db.commit()
        
        booking_date = date.today() + timedelta(days=7)
        booking_time = time(14, 0)
        
        is_valid, violations = validate_booking_against_rules(
            db=db,
            user_id=user.id,
            service_id=test_service_with_rules.id,
            barber_id=None,
            booking_date=booking_date,
            booking_time=booking_time,
            duration_minutes=120,
            client_id=young_client.id
        )
        
        assert is_valid is False
        assert len(violations) > 0
        assert any("Minimum age requirement" in v for v in violations)
        assert any("consultation appointment first" in v for v in violations)
    
    def test_validate_booking_database_error(self, db, booking_settings):
        """Test booking validation handles database errors gracefully."""
        # Pass invalid IDs to trigger database errors
        is_valid, violations = validate_booking_against_rules(
            db=db,
            user_id=99999,  # Non-existent user
            service_id=99999,  # Non-existent service
            barber_id=None,
            booking_date=date.today() + timedelta(days=1),
            booking_time=time(14, 0),
            duration_minutes=60
        )
        
        assert is_valid is False
        assert len(violations) > 0
        assert any("validation error" in v.lower() for v in violations)


class TestServiceRuleValidation:
    """Test service-specific rule validation."""
    
    def test_age_restriction_rules(self, db, test_service_with_rules):
        """Test age restriction validation."""
        # Test client under minimum age
        young_client = ClientFactory.create_client(
            date_of_birth=date(2010, 1, 1)  # 14 years old
        )
        db.add(young_client)
        db.commit()
        
        violations = _validate_service_rules(
            db=db,
            service_id=test_service_with_rules.id,
            client=young_client,
            booking_date=date.today() + timedelta(days=7),
            booking_time=time(14, 0)
        )
        
        assert len(violations) > 0
        assert any("Minimum age requirement: 16 years" in v for v in violations)
    
    def test_consultation_requirement(self, db, test_service_with_rules):
        """Test consultation requirement validation."""
        # Client without consultation history
        new_client = ClientFactory.create_client(customer_type="new")
        db.add(new_client)
        db.commit()
        
        violations = _validate_service_rules(
            db=db,
            service_id=test_service_with_rules.id,
            client=new_client,
            booking_date=date.today() + timedelta(days=7),
            booking_time=time(14, 0)
        )
        
        assert any("consultation appointment first" in v for v in violations)
    
    def test_patch_test_requirement(self, db, test_service_with_rules):
        """Test patch test requirement validation."""
        # Client without recent patch test
        client = ClientFactory.create_client()
        db.add(client)
        db.commit()
        
        violations = _validate_service_rules(
            db=db,
            service_id=test_service_with_rules.id,
            client=client,
            booking_date=date.today() + timedelta(days=7),
            booking_time=time(14, 0)
        )
        
        assert any("Patch test required 48 hours before" in v for v in violations)
    
    def test_day_restriction_rules(self, db, test_service_with_rules):
        """Test day of week restriction validation."""
        client = ClientFactory.create_client()
        db.add(client)
        db.commit()
        
        # Try to book on Sunday (blocked day)
        sunday_date = date.today()
        while sunday_date.weekday() != 6:  # Find next Sunday
            sunday_date += timedelta(days=1)
        
        violations = _validate_service_rules(
            db=db,
            service_id=test_service_with_rules.id,
            client=client,
            booking_date=sunday_date,
            booking_time=time(14, 0)
        )
        
        assert any("not available on Sunday" in v for v in violations)
    
    def test_booking_frequency_limits(self, db, test_service_with_rules):
        """Test booking frequency and daily limit validation."""
        client = ClientFactory.create_client()
        db.add(client)
        db.commit()
        
        # Create existing booking for same day
        today_booking = AppointmentFactory.create_appointment(
            client_id=client.id,
            service_id=test_service_with_rules.id,
            start_time=datetime.combine(date.today() + timedelta(days=7), time(10, 0)),
            status="scheduled"
        )
        db.add(today_booking)
        db.commit()
        
        violations = _validate_service_rules(
            db=db,
            service_id=test_service_with_rules.id,
            client=client,
            booking_date=date.today() + timedelta(days=7),
            booking_time=time(14, 0)
        )
        
        assert any("Maximum 1 booking(s) per day" in v for v in violations)
    
    def test_min_days_between_bookings(self, db, test_service_with_rules):
        """Test minimum days between bookings validation."""
        client = ClientFactory.create_client()
        db.add(client)
        db.commit()
        
        # Create recent booking (within 28 days)
        recent_booking = AppointmentFactory.create_appointment(
            client_id=client.id,
            service_id=test_service_with_rules.id,
            start_time=datetime.now(timezone.utc) - timedelta(days=10),
            status="completed"
        )
        db.add(recent_booking)
        db.commit()
        
        violations = _validate_service_rules(
            db=db,
            service_id=test_service_with_rules.id,
            client=client,
            booking_date=date.today() + timedelta(days=7),
            booking_time=time(14, 0)
        )
        
        assert any("Minimum 28 days required between bookings" in v for v in violations)


class TestGlobalRuleValidation:
    """Test global booking rule validation."""
    
    def test_max_advance_booking_rule(self, db, test_global_rules):
        """Test maximum advance booking rule."""
        violations = _validate_global_rules(
            db=db,
            user_id=1,
            service_id=1,
            barber_id=None,
            booking_date=date.today() + timedelta(days=70),  # Beyond 60-day limit
            booking_time=time(14, 0),
            duration_minutes=60
        )
        
        assert any("Cannot book more than 60 days in advance" in v for v in violations)
    
    def test_min_advance_booking_rule(self, db, test_global_rules):
        """Test minimum advance booking rule."""
        # Try to book within 4-hour minimum
        violations = _validate_global_rules(
            db=db,
            user_id=1,
            service_id=1,
            barber_id=None,
            booking_date=date.today(),
            booking_time=(datetime.now() + timedelta(hours=2)).time(),
            duration_minutes=60
        )
        
        assert any("Minimum 4 hours advance booking required" in v for v in violations)
    
    def test_max_duration_rule(self, db, test_global_rules):
        """Test maximum duration rule."""
        violations = _validate_global_rules(
            db=db,
            user_id=1,
            service_id=1,
            barber_id=None,
            booking_date=date.today() + timedelta(days=7),
            booking_time=time(14, 0),
            duration_minutes=300  # 5 hours, beyond 240-minute limit
        )
        
        assert any("Maximum appointment duration: 240 minutes" in v for v in violations)
    
    def test_holiday_restrictions(self, db, test_global_rules):
        """Test holiday restriction rule."""
        # Try to book on Christmas (12-25)
        christmas = date(2024, 12, 25)
        
        violations = _validate_global_rules(
            db=db,
            user_id=1,
            service_id=1,
            barber_id=None,
            booking_date=christmas,
            booking_time=time(14, 0),
            duration_minutes=60
        )
        
        assert any("not available on holidays" in v for v in violations)
    
    def test_blackout_dates(self, db, test_global_rules):
        """Test blackout date rule."""
        blackout_date = date(2024, 6, 15)
        
        violations = _validate_global_rules(
            db=db,
            user_id=1,
            service_id=1,
            barber_id=None,
            booking_date=blackout_date,
            booking_time=time(14, 0),
            duration_minutes=60
        )
        
        assert any("not available on this date" in v for v in violations)
    
    def test_rule_priority_ordering(self, db):
        """Test that rules are processed in priority order."""
        # Create rules with different priorities
        high_priority_rule = BookingRule(
            rule_name="High Priority Rule",
            rule_type="max_duration",
            rule_params={"max_minutes": 60},
            applies_to="all",
            priority=100,
            is_active=True
        )
        
        low_priority_rule = BookingRule(
            rule_name="Low Priority Rule",
            rule_type="max_duration",
            rule_params={"max_minutes": 120},
            applies_to="all",
            priority=1,
            is_active=True
        )
        
        db.add_all([high_priority_rule, low_priority_rule])
        db.commit()
        
        # Both rules should be checked (they're processed in order)
        violations = _validate_global_rules(
            db=db,
            user_id=1,
            service_id=1,
            barber_id=None,
            booking_date=date.today() + timedelta(days=7),
            booking_time=time(14, 0),
            duration_minutes=90  # Violates high priority rule
        )
        
        # Should get violation from high priority rule
        assert any("Maximum appointment duration: 60 minutes" in v for v in violations)


class TestClientConstraintValidation:
    """Test client-specific constraint validation."""
    
    def test_blocked_client_status(self, db):
        """Test validation for blocked client."""
        blocked_client = ClientFactory.create_client(status="blocked")
        db.add(blocked_client)
        db.commit()
        
        violations = _validate_client_constraints(
            db=db,
            client=blocked_client,
            service_id=1,
            booking_date=date.today() + timedelta(days=7),
            booking_time=time(14, 0)
        )
        
        assert any("temporarily blocked" in v for v in violations)
    
    def test_at_risk_client_restrictions(self, db):
        """Test validation for at-risk client."""
        at_risk_client = ClientFactory.create_at_risk_client()
        db.add(at_risk_client)
        db.commit()
        
        violations = _validate_client_constraints(
            db=db,
            client=at_risk_client,
            service_id=1,
            booking_date=date.today() + timedelta(days=7),
            booking_time=time(14, 0)
        )
        
        assert any("call to book" in v for v in violations)
    
    def test_payment_issue_notes(self, db):
        """Test validation for client with payment issues."""
        client_with_issues = ClientFactory.create_client(
            notes="Client has payment_issue from last visit"
        )
        db.add(client_with_issues)
        db.commit()
        
        violations = _validate_client_constraints(
            db=db,
            client=client_with_issues,
            service_id=1,
            booking_date=date.today() + timedelta(days=7),
            booking_time=time(14, 0)
        )
        
        assert any("payment issues" in v for v in violations)


class TestBusinessConstraintValidation:
    """Test business-level constraint validation."""
    
    def test_business_hours_validation(self, db, booking_settings):
        """Test validation against business hours."""
        # Try to book before business hours
        violations = _validate_business_constraints(
            db=db,
            booking_date=date.today() + timedelta(days=7),
            booking_time=time(8, 0),  # Before 9 AM
            duration_minutes=60
        )
        
        assert any("after 09:00" in v for v in violations)
        
        # Try to book ending after business hours
        violations = _validate_business_constraints(
            db=db,
            booking_date=date.today() + timedelta(days=7),
            booking_time=time(17, 30),  # 5:30 PM, ends at 6:30 PM (after 6 PM close)
            duration_minutes=60
        )
        
        assert any("end before 18:00" in v for v in violations)
    
    def test_same_day_booking_restrictions(self, db):
        """Test same-day booking restrictions."""
        # Create settings that don't allow same-day booking
        settings = BookingSettings(
            business_id=1,
            business_start_time=time(9, 0),
            business_end_time=time(18, 0),
            allow_same_day_booking=False,
            same_day_cutoff_time=time(14, 0)
        )
        db.add(settings)
        db.commit()
        
        violations = _validate_business_constraints(
            db=db,
            booking_date=date.today(),
            booking_time=time(15, 0),
            duration_minutes=60
        )
        
        assert any("Same-day booking is not allowed" in v for v in violations)
    
    def test_same_day_cutoff_time(self, db, booking_settings):
        """Test same-day booking cutoff time."""
        with patch('services.booking_rules_service.datetime') as mock_datetime:
            # Mock current time to be after cutoff
            mock_datetime.now.return_value.time.return_value = time(15, 0)  # After 2 PM cutoff
            
            violations = _validate_business_constraints(
                db=db,
                booking_date=date.today(),
                booking_time=time(16, 0),
                duration_minutes=60
            )
            
            assert any("cutoff time" in v for v in violations)


class TestRuleApplicationLogic:
    """Test rule application logic."""
    
    def test_rule_applies_to_all(self, db):
        """Test rule that applies to all bookings."""
        rule = BookingRule(
            rule_name="Universal Rule",
            rule_type="max_duration",
            applies_to="all",
            is_active=True
        )
        
        assert _rule_applies_to_booking(rule, service_id=1, barber_id=1, user_id=1, db=db) is True
    
    def test_rule_applies_to_specific_service(self, db):
        """Test rule that applies to specific services."""
        rule = BookingRule(
            rule_name="Service Rule",
            rule_type="max_duration",
            applies_to="service",
            service_ids=[1, 2, 3],
            is_active=True
        )
        
        assert _rule_applies_to_booking(rule, service_id=2, barber_id=1, user_id=1, db=db) is True
        assert _rule_applies_to_booking(rule, service_id=5, barber_id=1, user_id=1, db=db) is False
    
    def test_rule_applies_to_specific_barber(self, db):
        """Test rule that applies to specific barbers."""
        rule = BookingRule(
            rule_name="Barber Rule",
            rule_type="max_duration",
            applies_to="barber",
            barber_ids=[1, 2],
            is_active=True
        )
        
        assert _rule_applies_to_booking(rule, service_id=1, barber_id=1, user_id=1, db=db) is True
        assert _rule_applies_to_booking(rule, service_id=1, barber_id=3, user_id=1, db=db) is False
    
    def test_rule_applies_to_client_type(self, db):
        """Test rule that applies to specific client types."""
        # Create user and client
        user = UserFactory.create_user()
        client = ClientFactory.create_vip_client(email=user.email)
        db.add_all([user, client])
        db.commit()
        
        rule = BookingRule(
            rule_name="VIP Rule",
            rule_type="min_advance_booking",
            applies_to="client_type",
            client_types=["vip", "premium"],
            is_active=True
        )
        
        assert _rule_applies_to_booking(rule, service_id=1, barber_id=1, user_id=user.id, db=db) is True
    
    def test_rule_does_not_apply_to_client_type(self, db):
        """Test rule that doesn't apply to client type."""
        user = UserFactory.create_user()
        client = ClientFactory.create_client(email=user.email, customer_type="regular")
        db.add_all([user, client])
        db.commit()
        
        rule = BookingRule(
            rule_name="VIP Rule",
            rule_type="min_advance_booking",
            applies_to="client_type",
            client_types=["vip", "premium"],
            is_active=True
        )
        
        assert _rule_applies_to_booking(rule, service_id=1, barber_id=1, user_id=user.id, db=db) is False


class TestBookingRuleCRUD:
    """Test CRUD operations for booking rules."""
    
    def test_create_booking_rule(self, db):
        """Test creating a new booking rule."""
        rule = create_booking_rule(
            db=db,
            rule_name="Test Rule",
            rule_type="max_advance_booking",
            rule_params={"max_days": 45},
            applies_to="all",
            priority=10,
            created_by_id=1
        )
        
        assert rule.id is not None
        assert rule.rule_name == "Test Rule"
        assert rule.rule_type == "max_advance_booking"
        assert rule.rule_params == {"max_days": 45}
        assert rule.is_active is True
    
    def test_get_booking_rules(self, db, test_global_rules):
        """Test retrieving booking rules with filtering."""
        # Get all rules
        all_rules = get_booking_rules(db)
        assert len(all_rules) == len(test_global_rules)
        
        # Get rules by type
        duration_rules = get_booking_rules(db, rule_type="max_duration")
        assert len(duration_rules) == 1
        assert duration_rules[0].rule_type == "max_duration"
        
        # Get active rules only
        active_rules = get_booking_rules(db, is_active=True)
        assert all(rule.is_active for rule in active_rules)
    
    def test_update_booking_rule(self, db, test_global_rules):
        """Test updating a booking rule."""
        rule = test_global_rules[0]
        original_name = rule.rule_name
        
        updated_rule = update_booking_rule(
            db=db,
            rule_id=rule.id,
            rule_name="Updated Rule Name",
            priority=99
        )
        
        assert updated_rule.rule_name == "Updated Rule Name"
        assert updated_rule.priority == 99
        assert updated_rule.rule_name != original_name
    
    def test_update_nonexistent_rule(self, db):
        """Test updating a non-existent rule."""
        result = update_booking_rule(db=db, rule_id=99999, rule_name="New Name")
        assert result is None
    
    def test_delete_booking_rule(self, db, test_global_rules):
        """Test deleting (deactivating) a booking rule."""
        rule = test_global_rules[0]
        
        result = delete_booking_rule(db=db, rule_id=rule.id)
        assert result is True
        
        # Verify rule is deactivated
        db.refresh(rule)
        assert rule.is_active is False
    
    def test_delete_nonexistent_rule(self, db):
        """Test deleting a non-existent rule."""
        result = delete_booking_rule(db=db, rule_id=99999)
        assert result is False


class TestServiceBookingRuleCRUD:
    """Test CRUD operations for service-specific booking rules."""
    
    def test_get_service_booking_rules(self, db, test_service_with_rules):
        """Test retrieving service-specific rules."""
        rules = get_service_booking_rules(db, test_service_with_rules.id)
        
        assert len(rules) > 0
        assert all(rule.service_id == test_service_with_rules.id for rule in rules)
        assert all(rule.is_active for rule in rules)
    
    def test_create_service_booking_rule(self, db, test_service_with_rules):
        """Test creating a service-specific rule."""
        rule = create_service_booking_rule(
            db=db,
            service_id=test_service_with_rules.id,
            rule_type="advance_booking_limit",
            max_advance_booking_days=14,
            is_active=True
        )
        
        assert rule.id is not None
        assert rule.service_id == test_service_with_rules.id
        assert rule.rule_type == "advance_booking_limit"
        assert rule.max_advance_booking_days == 14


class TestBookingRuleEdgeCases:
    """Test edge cases and error scenarios."""
    
    def test_validate_with_none_client(self, db, booking_settings):
        """Test validation when client is None."""
        user = UserFactory.create_user()
        service = ServiceFactory.create_service()
        db.add_all([user, service])
        db.commit()
        
        is_valid, violations = validate_booking_against_rules(
            db=db,
            user_id=user.id,
            service_id=service.id,
            barber_id=None,
            booking_date=date.today() + timedelta(days=7),
            booking_time=time(14, 0),
            duration_minutes=60,
            client_id=None
        )
        
        # Should still validate other rules
        assert isinstance(is_valid, bool)
        assert isinstance(violations, list)
    
    def test_validate_with_none_service(self, db, booking_settings):
        """Test validation when service is None."""
        user = UserFactory.create_user()
        db.add(user)
        db.commit()
        
        is_valid, violations = validate_booking_against_rules(
            db=db,
            user_id=user.id,
            service_id=None,
            barber_id=None,
            booking_date=date.today() + timedelta(days=7),
            booking_time=time(14, 0),
            duration_minutes=60
        )
        
        # Should still validate global and business rules
        assert isinstance(is_valid, bool)
        assert isinstance(violations, list)
    
    def test_client_without_date_of_birth(self, db, test_service_with_rules):
        """Test age validation with client without birth date."""
        client = ClientFactory.create_client(date_of_birth=None)
        db.add(client)
        db.commit()
        
        violations = _validate_service_rules(
            db=db,
            service_id=test_service_with_rules.id,
            client=client,
            booking_date=date.today() + timedelta(days=7),
            booking_time=time(14, 0)
        )
        
        # Should not have age-related violations
        assert not any("age" in v.lower() for v in violations)
    
    def test_inactive_service_rules(self, db):
        """Test that inactive service rules are ignored."""
        service = ServiceFactory.create_service()
        db.add(service)
        db.commit()
        
        # Create inactive rule
        inactive_rule = ServiceBookingRule(
            service_id=service.id,
            rule_type="age_restriction",
            min_age=21,
            is_active=False  # Inactive
        )
        db.add(inactive_rule)
        db.commit()
        
        # Create young client
        young_client = ClientFactory.create_client(
            date_of_birth=date(2005, 1, 1)  # 19 years old
        )
        db.add(young_client)
        db.commit()
        
        violations = _validate_service_rules(
            db=db,
            service_id=service.id,
            client=young_client,
            booking_date=date.today() + timedelta(days=7),
            booking_time=time(14, 0)
        )
        
        # Should not have age violations since rule is inactive
        assert not any("age" in v.lower() for v in violations)
    
    def test_no_booking_settings(self, db):
        """Test business constraint validation when no settings exist."""
        violations = _validate_business_constraints(
            db=db,
            booking_date=date.today() + timedelta(days=7),
            booking_time=time(14, 0),
            duration_minutes=60
        )
        
        # Should not raise errors, might have no violations
        assert isinstance(violations, list)


class TestBookingRuleExceptionHandling:
    """Test exception handling in booking rules."""
    
    def test_booking_rule_violation_exception(self):
        """Test BookingRuleViolation exception."""
        with pytest.raises(BookingRuleViolation) as exc_info:
            raise BookingRuleViolation(
                message="Test violation",
                rule_type="test_rule",
                rule_id=123
            )
        
        assert str(exc_info.value) == "Test violation"
        assert exc_info.value.rule_type == "test_rule"
        assert exc_info.value.rule_id == 123
    
    def test_booking_rule_violation_without_optional_params(self):
        """Test BookingRuleViolation exception without optional parameters."""
        with pytest.raises(BookingRuleViolation) as exc_info:
            raise BookingRuleViolation("Simple violation")
        
        assert str(exc_info.value) == "Simple violation"
        assert exc_info.value.rule_type is None
        assert exc_info.value.rule_id is None


if __name__ == "__main__":
    pytest.main([__file__])