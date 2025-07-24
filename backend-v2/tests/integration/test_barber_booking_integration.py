"""
Integration tests for barber profile booking flow.

Tests the complete integration between:
- Barber profiles
- Booking system
- Client selection of barbers
- Time slot availability
- Payment processing

This ensures that barber profiles work correctly within
the booking context (NOT as a marketplace).
"""

import pytest
from datetime import datetime, timedelta, timezone, time, date
from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch

from main import app
from models import User, BarberProfile, Appointment, Service, BarberAvailability
from services.barber_profile_service import BarberProfileService
from services.booking_service import BookingService
from tests.factories import UserFactory, BaseFactory
from tests.test_barber_profiles import BarberProfileFactory


class BookingIntegrationFactory(BaseFactory):
    """Factory for booking integration test data."""
    
    @classmethod
    def create_service(cls, **kwargs):
        """Create a Service for booking tests."""
        defaults = {
            'id': cls.get_next_id(),
            'name': f'Service {cls.get_next_id()}',
            'description': 'Test service',
            'category': 'HAIRCUT',
            'base_price': Decimal('30.00'),
            'duration_minutes': 30,
            'is_active': True,
            'is_bookable_online': True,
            'created_at': datetime.now(timezone.utc)
        }
        defaults.update(kwargs)
        return Service(**defaults)
    
    @classmethod
    def create_barber_availability(cls, **kwargs):
        """Create barber availability for testing."""
        defaults = {
            'id': cls.get_next_id(),
            'barber_id': 1,
            'day_of_week': 1,  # Monday
            'start_time': time(9, 0),
            'end_time': time(17, 0),
            'is_active': True,
            'created_at': datetime.now(timezone.utc)
        }
        defaults.update(kwargs)
        return BarberAvailability(**defaults)


class TestBarberSelectionInBookingFlow:
    """Test barber selection within the booking flow."""
    
    def test_booking_flow_with_barber_selection(self, db: Session, client: TestClient):
        """Test complete booking flow: Service → Barber → Time → Confirm."""
        # Arrange: Create shop with multiple barbers
        shop_owner = UserFactory.create_user(role='shop_owner')
        barber1 = UserFactory.create_barber(email='barber1@example.com')
        barber2 = UserFactory.create_barber(email='barber2@example.com')
        
        profile1 = BarberProfileFactory.create_barber_profile(
            user_id=barber1.id,
            bio='Specialist in modern cuts',
            years_experience=5
        )
        profile2 = BarberProfileFactory.create_barber_profile(
            user_id=barber2.id,
            bio='Traditional barbering expert',
            years_experience=10
        )
        
        # Add specialties
        haircut_specialty = BarberProfileFactory.create_specialty(
            barber_profile_id=profile1.id,
            specialty_name='Haircut',
            description='Modern haircuts'
        )
        
        # Create service
        service = BookingIntegrationFactory.create_service(
            name='Haircut',
            base_price=Decimal('35.00'),
            duration_minutes=30
        )
        
        # Create availability for both barbers
        tomorrow = date.today() + timedelta(days=1)
        day_of_week = tomorrow.weekday()
        
        availability1 = BookingIntegrationFactory.create_barber_availability(
            barber_id=barber1.id,
            day_of_week=day_of_week,
            start_time=time(9, 0),
            end_time=time(17, 0)
        )
        availability2 = BookingIntegrationFactory.create_barber_availability(
            barber_id=barber2.id,
            day_of_week=day_of_week,
            start_time=time(10, 0),
            end_time=time(18, 0)
        )
        
        db.add_all([
            shop_owner, barber1, barber2, profile1, profile2,
            haircut_specialty, service, availability1, availability2
        ])
        db.commit()
        
        # Act & Assert: Step-by-step booking flow
        
        # Step 1: Get available barbers for service
        response = client.get('/api/v2/barber-profiles/available')
        assert response.status_code == 200
        
        barbers_data = response.json()
        assert len(barbers_data['barbers']) == 2
        
        # Verify barber data structure for frontend
        barber_data = barbers_data['barbers'][0]
        assert 'id' in barber_data
        assert 'name' in barber_data
        assert 'bio' in barber_data
        assert 'specialties' in barber_data
        assert 'profile_image_url' in barber_data
        
        # Step 2: Select barber1 and get their availability
        selected_barber_id = barber1.id
        tomorrow_str = tomorrow.strftime('%Y-%m-%d')
        
        response = client.get(
            f'/api/v2/time-slots?date={tomorrow_str}&barber_id={selected_barber_id}&service=Haircut'
        )
        assert response.status_code == 200
        
        slots_data = response.json()
        assert len(slots_data['slots']) > 0
        
        # Step 3: Book appointment with selected barber
        booking_data = {
            'date': tomorrow_str,
            'time': '14:00',
            'service': 'Haircut',
            'barber_id': selected_barber_id,
            'guest_info': {
                'first_name': 'John',
                'last_name': 'Doe',
                'email': 'john.doe@example.com',
                'phone': '555-1234'
            }
        }
        
        response = client.post('/api/v2/bookings/guest', json=booking_data)
        assert response.status_code == 201
        
        booking_response = response.json()
        assert booking_response['barber_id'] == selected_barber_id
        assert booking_response['service'] == 'Haircut'
        assert booking_response['date'] == tomorrow_str
        assert booking_response['time'] == '14:00'
    
    def test_barber_specialty_affects_pricing(self, db: Session):
        """Test that barber specialties affect service pricing."""
        # Arrange
        barber = UserFactory.create_barber()
        profile = BarberProfileFactory.create_barber_profile(user_id=barber.id)
        
        # Create specialty with price modifier
        specialty = BarberProfileFactory.create_specialty(
            barber_profile_id=profile.id,
            specialty_name='Premium Haircut',
            price_modifier=Decimal('1.25')  # 25% premium
        )
        
        service = BookingIntegrationFactory.create_service(
            name='Premium Haircut',
            base_price=Decimal('40.00')
        )
        
        db.add_all([barber, profile, specialty, service])
        db.commit()
        
        # Act
        barber_service = BarberProfileService(db)
        pricing = barber_service.calculate_service_pricing(profile.id, service.id)
        
        # Assert
        expected_price = Decimal('40.00') * Decimal('1.25')  # 50.00
        assert pricing['final_price'] == expected_price
        assert pricing['base_price'] == Decimal('40.00')
        assert pricing['modifier'] == Decimal('1.25')
        assert pricing['specialty_name'] == 'Premium Haircut'
    
    def test_barber_availability_filtering(self, db: Session, client: TestClient):
        """Test that only available barbers appear in selection."""
        # Arrange
        available_barber = UserFactory.create_barber(email='available@example.com')
        unavailable_barber = UserFactory.create_barber(email='unavailable@example.com')
        
        available_profile = BarberProfileFactory.create_barber_profile(
            user_id=available_barber.id,
            is_active=True
        )
        unavailable_profile = BarberProfileFactory.create_barber_profile(
            user_id=unavailable_barber.id,
            is_active=False  # Inactive profile
        )
        
        # Only create availability for available barber
        tomorrow = date.today() + timedelta(days=1)
        availability = BookingIntegrationFactory.create_barber_availability(
            barber_id=available_barber.id,
            day_of_week=tomorrow.weekday()
        )
        
        db.add_all([
            available_barber, unavailable_barber,
            available_profile, unavailable_profile,
            availability
        ])
        db.commit()
        
        # Act
        response = client.get('/api/v2/barber-profiles/available')
        
        # Assert
        assert response.status_code == 200
        barbers_data = response.json()
        
        # Should only show available barber
        assert len(barbers_data['barbers']) == 1
        assert barbers_data['barbers'][0]['id'] == available_barber.id
    
    def test_next_available_barber_functionality(self, db: Session, client: TestClient):
        """Test 'Next Available Barber' booking option."""
        # Arrange
        barber1 = UserFactory.create_barber(email='barber1@example.com')
        barber2 = UserFactory.create_barber(email='barber2@example.com')
        
        profile1 = BarberProfileFactory.create_barber_profile(user_id=barber1.id)
        profile2 = BarberProfileFactory.create_barber_profile(user_id=barber2.id)
        
        # Create availability - barber2 has earlier availability
        tomorrow = date.today() + timedelta(days=1)
        day_of_week = tomorrow.weekday()
        
        availability1 = BookingIntegrationFactory.create_barber_availability(
            barber_id=barber1.id,
            day_of_week=day_of_week,
            start_time=time(12, 0),  # Later start
            end_time=time(18, 0)
        )
        availability2 = BookingIntegrationFactory.create_barber_availability(
            barber_id=barber2.id,
            day_of_week=day_of_week,
            start_time=time(9, 0),   # Earlier start
            end_time=time(17, 0)
        )
        
        service = BookingIntegrationFactory.create_service(name='Haircut')
        
        db.add_all([
            barber1, barber2, profile1, profile2,
            availability1, availability2, service
        ])
        db.commit()
        
        # Act - Get next available slot
        response = client.get('/api/v2/bookings/next-available?service=Haircut')
        
        # Assert
        assert response.status_code == 200
        next_available = response.json()
        
        # Should return barber2 who has earlier availability
        assert next_available['barber_id'] == barber2.id
        assert next_available['time'] == '09:00'  # Earliest available time
    
    def test_barber_profile_completion_affects_ranking(self, db: Session):
        """Test that more complete profiles rank higher in selection."""
        # Arrange
        complete_barber = UserFactory.create_barber(email='complete@example.com')
        incomplete_barber = UserFactory.create_barber(email='incomplete@example.com')
        
        # Complete profile
        complete_profile = BarberProfileFactory.create_barber_profile(
            user_id=complete_barber.id,
            bio='Detailed bio with lots of information',
            years_experience=10,
            profile_image_url='https://example.com/complete.jpg',
            instagram_url='https://instagram.com/complete',
            website_url='https://complete.com',
            certifications=['Cert 1', 'Cert 2'],
            awards=['Award 1'],
            education=['Education 1']
        )
        
        # Incomplete profile
        incomplete_profile = BarberProfileFactory.create_barber_profile(
            user_id=incomplete_barber.id,
            bio='Basic bio',
            years_experience=3,
            profile_image_url=None,
            instagram_url=None,
            website_url=None,
            certifications=[],
            awards=[],
            education=[]
        )
        
        db.add_all([
            complete_barber, incomplete_barber,
            complete_profile, incomplete_profile
        ])
        db.commit()
        
        # Act
        service = BarberProfileService(db)
        ranked_profiles = service.get_profiles_ranked_by_completion()
        
        # Assert
        assert len(ranked_profiles) == 2
        # Complete profile should rank first
        assert ranked_profiles[0].user_id == complete_barber.id
        assert ranked_profiles[1].user_id == incomplete_barber.id
        
        # Verify completion percentages
        complete_completion = service.calculate_profile_completion(complete_profile)
        incomplete_completion = service.calculate_profile_completion(incomplete_profile)
        assert complete_completion > incomplete_completion


class TestBarberProfileBookingConstraints:
    """Test booking constraints based on barber profiles."""
    
    def test_barber_service_availability(self, db: Session):
        """Test that barbers can only be booked for their offered services."""
        # Arrange
        barber = UserFactory.create_barber()
        profile = BarberProfileFactory.create_barber_profile(user_id=barber.id)
        
        # Barber only offers haircuts
        haircut_specialty = BarberProfileFactory.create_specialty(
            barber_profile_id=profile.id,
            specialty_name='Haircut'
        )
        
        haircut_service = BookingIntegrationFactory.create_service(name='Haircut')
        shave_service = BookingIntegrationFactory.create_service(name='Shave')
        
        db.add_all([
            barber, profile, haircut_specialty,
            haircut_service, shave_service
        ])
        db.commit()
        
        service = BarberProfileService(db)
        
        # Act & Assert
        # Barber can provide haircut service
        can_provide_haircut = service.can_barber_provide_service(barber.id, 'Haircut')
        assert can_provide_haircut is True
        
        # Barber cannot provide shave service (no specialty)
        can_provide_shave = service.can_barber_provide_service(barber.id, 'Shave')
        assert can_provide_shave is False
    
    def test_barber_hourly_rate_affects_pricing(self, db: Session):
        """Test that barber's hourly rate affects appointment pricing."""
        # Arrange
        expensive_barber = UserFactory.create_barber()
        cheap_barber = UserFactory.create_barber()
        
        expensive_profile = BarberProfileFactory.create_barber_profile(
            user_id=expensive_barber.id,
            hourly_rate=Decimal('80.00')
        )
        cheap_profile = BarberProfileFactory.create_barber_profile(
            user_id=cheap_barber.id,
            hourly_rate=Decimal('40.00')
        )
        
        service = BookingIntegrationFactory.create_service(
            name='Haircut',
            base_price=Decimal('30.00'),
            duration_minutes=60  # 1 hour service
        )
        
        db.add_all([
            expensive_barber, cheap_barber,
            expensive_profile, cheap_profile,
            service
        ])
        db.commit()
        
        barber_service = BarberProfileService(db)
        
        # Act
        expensive_price = barber_service.calculate_appointment_price(
            expensive_barber.id, service.id
        )
        cheap_price = barber_service.calculate_appointment_price(
            cheap_barber.id, service.id
        )
        
        # Assert
        # Expensive barber should cost more
        assert expensive_price > cheap_price
        # Should use barber's hourly rate for 1-hour service
        assert expensive_price == Decimal('80.00')
        assert cheap_price == Decimal('40.00')


class TestBarberProfileValidation:
    """Test validation rules for barber profiles in booking context."""
    
    def test_inactive_barbers_not_bookable(self, db: Session, client: TestClient):
        """Test that inactive barbers cannot be booked."""
        # Arrange
        inactive_barber = UserFactory.create_barber()
        inactive_profile = BarberProfileFactory.create_barber_profile(
            user_id=inactive_barber.id,
            is_active=False
        )
        
        service = BookingIntegrationFactory.create_service(name='Haircut')
        
        db.add_all([inactive_barber, inactive_profile, service])
        db.commit()
        
        # Act - Try to book inactive barber
        tomorrow_str = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')
        booking_data = {
            'date': tomorrow_str,
            'time': '14:00',
            'service': 'Haircut',
            'barber_id': inactive_barber.id,
            'guest_info': {
                'first_name': 'John',
                'last_name': 'Doe',
                'email': 'john@example.com',
                'phone': '555-1234'
            }
        }
        
        response = client.post('/api/v2/bookings/guest', json=booking_data)
        
        # Assert
        assert response.status_code == 400
        assert 'not available' in response.json()['detail'].lower()
    
    def test_barber_without_profile_not_bookable(self, db: Session, client: TestClient):
        """Test that barbers without profiles cannot be booked."""
        # Arrange
        barber_without_profile = UserFactory.create_barber()
        service = BookingIntegrationFactory.create_service(name='Haircut')
        
        db.add_all([barber_without_profile, service])
        db.commit()
        
        # Act - Try to book barber without profile
        tomorrow_str = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')
        booking_data = {
            'date': tomorrow_str,
            'time': '14:00',
            'service': 'Haircut',
            'barber_id': barber_without_profile.id,
            'guest_info': {
                'first_name': 'John',
                'last_name': 'Doe',
                'email': 'john@example.com',
                'phone': '555-1234'
            }
        }
        
        response = client.post('/api/v2/bookings/guest', json=booking_data)
        
        # Assert
        assert response.status_code == 400
        assert 'profile not found' in response.json()['detail'].lower()


# Integration test for complete barber profile booking workflow
@pytest.mark.integration
def test_end_to_end_barber_booking_workflow(db: Session, client: TestClient):
    """
    Complete end-to-end test of barber profile booking workflow.
    
    Tests the full user journey:
    1. Shop setup with barbers and profiles
    2. Client views available barbers
    3. Client selects barber based on specialties
    4. Client books appointment with selected barber
    5. Appointment is confirmed with correct pricing
    """
    # Setup shop with barbers
    shop_owner = UserFactory.create_user(role='shop_owner')
    
    # Create barbers with different specialties
    modern_barber = UserFactory.create_barber(email='modern@shop.com', name='Alex Modern')
    traditional_barber = UserFactory.create_barber(email='traditional@shop.com', name='Bob Traditional')
    
    # Create detailed profiles
    modern_profile = BarberProfileFactory.create_barber_profile(
        user_id=modern_barber.id,
        bio='Specialist in modern cuts and styling',
        years_experience=6,
        hourly_rate=Decimal('55.00'),
        profile_image_url='https://shop.com/alex.jpg'
    )
    
    traditional_profile = BarberProfileFactory.create_barber_profile(
        user_id=traditional_barber.id,
        bio='Master of traditional barbering techniques',
        years_experience=15,
        hourly_rate=Decimal('65.00'),
        profile_image_url='https://shop.com/bob.jpg'
    )
    
    # Add specialties
    modern_specialty = BarberProfileFactory.create_specialty(
        barber_profile_id=modern_profile.id,
        specialty_name='Modern Cuts',
        description='Fades, undercuts, contemporary styles',
        price_modifier=Decimal('1.1')
    )
    
    traditional_specialty = BarberProfileFactory.create_specialty(
        barber_profile_id=traditional_profile.id,
        specialty_name='Traditional Shave',
        description='Hot towel, straight razor shaves',
        price_modifier=Decimal('1.3')
    )
    
    # Add portfolio images
    modern_portfolio = BarberProfileFactory.create_portfolio_image(
        barber_profile_id=modern_profile.id,
        image_url='https://shop.com/modern_work.jpg',
        description='Modern fade cut',
        is_featured=True
    )
    
    # Create services
    haircut_service = BookingIntegrationFactory.create_service(
        name='Haircut',
        base_price=Decimal('35.00'),
        duration_minutes=45
    )
    
    shave_service = BookingIntegrationFactory.create_service(
        name='Traditional Shave',
        base_price=Decimal('45.00'),
        duration_minutes=30
    )
    
    # Create availability
    tomorrow = date.today() + timedelta(days=1)
    day_of_week = tomorrow.weekday()
    
    modern_availability = BookingIntegrationFactory.create_barber_availability(
        barber_id=modern_barber.id,
        day_of_week=day_of_week,
        start_time=time(9, 0),
        end_time=time(17, 0)
    )
    
    traditional_availability = BookingIntegrationFactory.create_barber_availability(
        barber_id=traditional_barber.id,
        day_of_week=day_of_week,
        start_time=time(10, 0),
        end_time=time(18, 0)
    )
    
    # Save all data
    db.add_all([
        shop_owner, modern_barber, traditional_barber,
        modern_profile, traditional_profile,
        modern_specialty, traditional_specialty,
        modern_portfolio,
        haircut_service, shave_service,
        modern_availability, traditional_availability
    ])
    db.commit()
    
    # Test workflow
    
    # 1. Client views available barbers
    response = client.get('/api/v2/barber-profiles/available')
    assert response.status_code == 200
    
    barbers = response.json()['barbers']
    assert len(barbers) == 2
    
    # Verify barber data includes all needed information
    alex_barber = next(b for b in barbers if b['name'] == 'Alex Modern')
    bob_barber = next(b for b in barbers if b['name'] == 'Bob Traditional')
    
    assert alex_barber['bio'] == 'Specialist in modern cuts and styling'
    assert len(alex_barber['specialties']) == 1
    assert alex_barber['specialties'][0]['specialty_name'] == 'Modern Cuts'
    assert len(alex_barber['portfolio_images']) == 1
    
    # 2. Client wants a traditional shave, selects Bob
    selected_barber_id = bob_barber['id']
    
    # 3. Client checks availability for selected barber
    tomorrow_str = tomorrow.strftime('%Y-%m-%d')
    response = client.get(
        f'/api/v2/time-slots?date={tomorrow_str}&barber_id={selected_barber_id}&service=Traditional Shave'
    )
    assert response.status_code == 200
    
    slots = response.json()['slots']
    assert len(slots) > 0
    available_slot = next(slot for slot in slots if slot['available'])
    
    # 4. Client books appointment
    booking_data = {
        'date': tomorrow_str,
        'time': available_slot['time'],
        'service': 'Traditional Shave',
        'barber_id': selected_barber_id,
        'guest_info': {
            'first_name': 'John',
            'last_name': 'Client',
            'email': 'john.client@example.com',
            'phone': '555-0123'
        }
    }
    
    response = client.post('/api/v2/bookings/guest', json=booking_data)
    assert response.status_code == 201
    
    booking = response.json()
    
    # 5. Verify booking details
    assert booking['barber_id'] == selected_barber_id
    assert booking['barber_name'] == 'Bob Traditional'
    assert booking['service'] == 'Traditional Shave'
    assert booking['date'] == tomorrow_str
    
    # Verify pricing includes specialty modifier
    base_price = Decimal('45.00')
    modifier = Decimal('1.3')
    expected_price = base_price * modifier
    assert Decimal(str(booking['price'])) == expected_price
    
    # 6. Verify appointment was created in database
    db_appointment = db.query(Appointment).filter(
        Appointment.user_id == selected_barber_id,
        Appointment.service_name == 'Traditional Shave'
    ).first()
    
    assert db_appointment is not None
    assert db_appointment.client_name == 'John Client'
    assert db_appointment.price == float(expected_price)