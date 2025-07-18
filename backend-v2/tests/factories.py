"""
Test data factories for consistent test data generation.

This module provides factory functions and classes to create test data
with sensible defaults while allowing customization. This ensures:
- Consistent test data across all tests
- Reduced boilerplate in test files
- Easy maintenance of test data structures
- Type-safe test data generation
"""

from datetime import datetime, timedelta, timezone, date, time
from typing import Optional, Dict, Any, List
from decimal import Decimal
import random
import string

from models import (
    User, Client, Appointment, Service, Payment, 
    NotificationTemplate, NotificationQueue, NotificationPreference,
    BarberAvailability, ServiceBookingRule, ServicePricingRule
)
from schemas import (
    UserCreate, ClientCreate, AppointmentCreate, ServiceCreate
)


class BaseFactory:
    """Base factory with common functionality."""
    
    _counter = 0
    
    @classmethod
    def get_next_id(cls) -> int:
        """Get next unique ID for testing."""
        cls._counter += 1
        return cls._counter
    
    @classmethod
    def random_string(cls, length: int = 10) -> str:
        """Generate random string for unique values."""
        return ''.join(random.choices(string.ascii_letters + string.digits, k=length))
    
    @classmethod
    def random_email(cls, prefix: str = "user") -> str:
        """Generate unique email address."""
        return f"{prefix}_{cls.random_string(5)}@example.com"
    
    @classmethod
    def random_phone(cls) -> str:
        """Generate random phone number."""
        area = random.randint(200, 999)
        exchange = random.randint(200, 999)
        number = random.randint(1000, 9999)
        return f"({area}) {exchange}-{number}"


class UserFactory(BaseFactory):
    """Factory for creating User instances and schemas."""
    
    @classmethod
    def create_user(cls, **kwargs) -> User:
        """Create a User model instance with defaults."""
        defaults = {
            'id': cls.get_next_id(),
            'email': cls.random_email(),
            'name': f"Test User {cls.get_next_id()}",
            'hashed_password': "$2b$12$fake_hashed_password",
            'role': 'user',
            'is_active': True,
            'created_at': datetime.now(timezone.utc)
        }
        defaults.update(kwargs)
        return User(**defaults)
    
    @classmethod
    def create_user_schema(cls, **kwargs) -> UserCreate:
        """Create a UserCreate schema with defaults."""
        defaults = {
            'email': cls.random_email(),
            'password': 'TestPassword123!',
            'first_name': f"Test",
            'last_name': f"User{cls.get_next_id()}",
            'phone': cls.random_phone(),
            'role': 'user'
        }
        defaults.update(kwargs)
        return UserCreate(**defaults)
    
    @classmethod
    def create_barber(cls, **kwargs) -> User:
        """Create a barber user."""
        kwargs['role'] = 'barber'
        kwargs.setdefault('name', f"Test Barber {cls.get_next_id()}")
        return cls.create_user(**kwargs)
    
    @classmethod
    def create_admin(cls, **kwargs) -> User:
        """Create an admin user."""
        kwargs['role'] = 'admin'
        kwargs.setdefault('name', f"Test Admin {cls.get_next_id()}")
        return cls.create_user(**kwargs)


class ClientFactory(BaseFactory):
    """Factory for creating Client instances and schemas."""
    
    @classmethod
    def create_client(cls, **kwargs) -> Client:
        """Create a Client model instance with defaults."""
        defaults = {
            'id': cls.get_next_id(),
            'first_name': f"Client",
            'last_name': f"Test{cls.get_next_id()}",
            'email': cls.random_email('client'),
            'phone': cls.random_phone(),
            'customer_type': 'new',
            'total_visits': 0,
            'total_spent': 0.0,
            'average_ticket': 0.0,
            'no_show_count': 0,
            'cancellation_count': 0,
            'created_by_id': 1,
            'created_at': datetime.now(timezone.utc),
            'email_enabled': True,
            'sms_enabled': True,
            'marketing_enabled': False
        }
        defaults.update(kwargs)
        return Client(**defaults)
    
    @classmethod
    def create_client_schema(cls, **kwargs) -> ClientCreate:
        """Create a ClientCreate schema with defaults."""
        defaults = {
            'first_name': f"Client",
            'last_name': f"Test{cls.get_next_id()}",
            'email': cls.random_email('client'),
            'phone': cls.random_phone(),
            'notes': "Test client created by factory",
            'tags': ["test", "factory"],
            'communication_preferences': {
                'email': True,
                'sms': True,
                'marketing': False
            }
        }
        defaults.update(kwargs)
        return ClientCreate(**defaults)
    
    @classmethod
    def create_vip_client(cls, **kwargs) -> Client:
        """Create a VIP client with high engagement metrics."""
        kwargs.update({
            'customer_type': 'vip',
            'total_visits': kwargs.get('total_visits', 15),
            'total_spent': kwargs.get('total_spent', 750.0),
            'average_ticket': kwargs.get('average_ticket', 50.0)
        })
        return cls.create_client(**kwargs)
    
    @classmethod
    def create_at_risk_client(cls, **kwargs) -> Client:
        """Create an at-risk client."""
        kwargs.update({
            'customer_type': 'at_risk',
            'no_show_count': kwargs.get('no_show_count', 3),
            'last_visit_date': datetime.now(timezone.utc) - timedelta(days=120)
        })
        return cls.create_client(**kwargs)


class AppointmentFactory(BaseFactory):
    """Factory for creating Appointment instances and schemas."""
    
    @classmethod
    def create_appointment(cls, **kwargs) -> Appointment:
        """Create an Appointment model instance with defaults."""
        start_time = kwargs.get('start_time', datetime.now(timezone.utc) + timedelta(days=1))
        defaults = {
            'id': cls.get_next_id(),
            'user_id': 1,  # barber
            'client_id': 1,
            'service_id': 1,
            'service_name': 'Haircut',
            'start_time': start_time,
            'duration_minutes': 30,
            'price': 30.0,
            'status': 'pending',
            'created_at': datetime.now(timezone.utc)
        }
        defaults.update(kwargs)
        return Appointment(**defaults)
    
    @classmethod
    def create_appointment_schema(cls, **kwargs) -> AppointmentCreate:
        """Create an AppointmentCreate schema with defaults."""
        appointment_date = kwargs.get('date', date.today() + timedelta(days=1))
        defaults = {
            'client_id': 1,
            'service_id': 1,
            'date': appointment_date,
            'time': "14:00",
            'duration_minutes': 30,
            'price': 30.0,
            'notes': "Test appointment"
        }
        defaults.update(kwargs)
        return AppointmentCreate(**defaults)
    
    @classmethod
    def create_completed_appointment(cls, **kwargs) -> Appointment:
        """Create a completed appointment in the past."""
        kwargs.update({
            'status': 'completed',
            'start_time': datetime.now(timezone.utc) - timedelta(days=7)
        })
        return cls.create_appointment(**kwargs)
    
    @classmethod
    def create_no_show_appointment(cls, **kwargs) -> Appointment:
        """Create a no-show appointment."""
        kwargs.update({
            'status': 'no_show',
            'start_time': datetime.now(timezone.utc) - timedelta(days=3)
        })
        return cls.create_appointment(**kwargs)


class ServiceFactory(BaseFactory):
    """Factory for creating Service instances and schemas."""
    
    @classmethod
    def create_service(cls, **kwargs) -> Service:
        """Create a Service model instance with defaults."""
        defaults = {
            'id': cls.get_next_id(),
            'name': f"Service {cls.get_next_id()}",
            'description': "Test service description",
            'category': 'HAIRCUT',
            'base_price': 30.0,
            'duration_minutes': 30,
            'is_active': True,
            'is_bookable_online': True,
            'display_order': cls.get_next_id(),
            'created_at': datetime.now(timezone.utc)
        }
        defaults.update(kwargs)
        return Service(**defaults)
    
    @classmethod
    def create_service_schema(cls, **kwargs) -> ServiceCreate:
        """Create a ServiceCreate schema with defaults."""
        defaults = {
            'name': f"Service {cls.get_next_id()}",
            'description': "Test service description",
            'category': 'HAIRCUT',
            'base_price': 30.0,
            'duration_minutes': 30,
            'is_bookable_online': True,
            'buffer_time': 0,
            'max_advance_booking_days': 30,
            'min_advance_booking_hours': 2
        }
        defaults.update(kwargs)
        return ServiceCreate(**defaults)
    
    @classmethod
    def create_premium_service(cls, **kwargs) -> Service:
        """Create a premium service with higher price."""
        kwargs.update({
            'category': 'PACKAGE',
            'base_price': kwargs.get('base_price', 75.0),
            'duration_minutes': kwargs.get('duration_minutes', 60)
        })
        return cls.create_service(**kwargs)


class PaymentFactory(BaseFactory):
    """Factory for creating Payment instances."""
    
    @classmethod
    def create_payment(cls, **kwargs) -> Payment:
        """Create a Payment model instance with defaults."""
        defaults = {
            'id': cls.get_next_id(),
            'user_id': 1,
            'appointment_id': 1,
            'barber_id': 1,
            'stripe_payment_intent_id': f"pi_test_{cls.random_string(24)}",
            'amount': 30.0,
            'status': 'completed',
            'platform_fee': 6.0,  # 20% of 30
            'barber_amount': 24.0,  # 30 - 6
            'commission_rate': 0.20,
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        }
        defaults.update(kwargs)
        return Payment(**defaults)
    
    @classmethod
    def create_pending_payment(cls, **kwargs) -> Payment:
        """Create a pending payment."""
        kwargs['status'] = 'pending'
        return cls.create_payment(**kwargs)
    
    @classmethod
    def create_failed_payment(cls, **kwargs) -> Payment:
        """Create a failed payment."""
        kwargs['status'] = 'failed'
        return cls.create_payment(**kwargs)


class NotificationFactory(BaseFactory):
    """Factory for creating notification-related instances."""
    
    @classmethod
    def create_notification_template(cls, **kwargs) -> NotificationTemplate:
        """Create a NotificationTemplate instance."""
        defaults = {
            'id': cls.get_next_id(),
            'name': f"template_{cls.random_string(10)}",
            'template_type': 'email',
            'subject': "Test Subject",
            'body': "Hello {{client_name}}, this is a test.",
            'variables': ["client_name"],
            'is_active': True,
            'created_at': datetime.now(timezone.utc)
        }
        defaults.update(kwargs)
        return NotificationTemplate(**defaults)
    
    @classmethod
    def create_notification_preferences(cls, **kwargs) -> NotificationPreference:
        """Create NotificationPreference instance."""
        defaults = {
            'id': cls.get_next_id(),
            'user_id': 1,
            'email_enabled': True,
            'sms_enabled': True,
            'email_appointment_confirmation': True,
            'sms_appointment_confirmation': True,
            'email_appointment_reminder': True,
            'sms_appointment_reminder': True,
            'email_appointment_changes': True,
            'sms_appointment_changes': True,
            'reminder_hours': [24, 2],
            'created_at': datetime.now(timezone.utc)
        }
        defaults.update(kwargs)
        return NotificationPreference(**defaults)


class AvailabilityFactory(BaseFactory):
    """Factory for creating availability-related instances."""
    
    @classmethod
    def create_barber_availability(cls, **kwargs) -> BarberAvailability:
        """Create BarberAvailability instance."""
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
    
    @classmethod
    def create_weekly_availability(cls, barber_id: int = 1) -> List[BarberAvailability]:
        """Create availability for full week."""
        availability = []
        for day in range(7):  # 0-6 (Monday-Sunday)
            if day < 5:  # Weekdays
                avail = cls.create_barber_availability(
                    barber_id=barber_id,
                    day_of_week=day,
                    start_time=time(9, 0),
                    end_time=time(18, 0)
                )
            else:  # Weekend
                avail = cls.create_barber_availability(
                    barber_id=barber_id,
                    day_of_week=day,
                    start_time=time(10, 0),
                    end_time=time(16, 0)
                )
            availability.append(avail)
        return availability


# Convenience functions for quick test data generation

def create_test_user(**kwargs) -> User:
    """Quick function to create a test user."""
    return UserFactory.create_user(**kwargs)


def create_test_client(**kwargs) -> Client:
    """Quick function to create a test client."""
    return ClientFactory.create_client(**kwargs)


def create_test_appointment(**kwargs) -> Appointment:
    """Quick function to create a test appointment."""
    return AppointmentFactory.create_appointment(**kwargs)


def create_test_service(**kwargs) -> Service:
    """Quick function to create a test service."""
    return ServiceFactory.create_service(**kwargs)


def create_full_test_scenario(db):
    """
    Create a complete test scenario with related data.
    Useful for integration tests.
    
    Returns:
        dict: Contains barber, client, service, and appointment
    """
    # Create users
    barber = UserFactory.create_barber()
    client = ClientFactory.create_client(created_by_id=barber.id)
    
    # Create service
    service = ServiceFactory.create_service(
        name="Premium Haircut",
        base_price=45.0,
        duration_minutes=45
    )
    
    # Create availability
    availability = AvailabilityFactory.create_weekly_availability(barber.id)
    
    # Create appointment
    appointment = AppointmentFactory.create_appointment(
        user_id=barber.id,
        client_id=client.id,
        service_id=service.id,
        service_name=service.name,
        price=service.base_price,
        duration_minutes=service.duration_minutes
    )
    
    # Add to database
    db.add_all([barber, client, service] + availability + [appointment])
    db.commit()
    
    return {
        'barber': barber,
        'client': client,
        'service': service,
        'appointment': appointment,
        'availability': availability
    }