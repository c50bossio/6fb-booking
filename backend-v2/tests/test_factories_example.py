"""
Example test file demonstrating the use of test data factories.

This file shows best practices for using the factory patterns to create
consistent, maintainable test data.
"""

import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from tests.factories import (
    UserFactory, ClientFactory, AppointmentFactory, 
    ServiceFactory, PaymentFactory, NotificationFactory,
    AvailabilityFactory, create_full_test_scenario
)
from models import User, Client, Appointment, Service


class TestFactoryExamples:
    """Examples of using test factories in different scenarios."""
    
    def test_simple_user_creation(self, db: Session):
        """Example: Create a simple user with defaults."""
        # Create user with all defaults
        user = UserFactory.create_user()
        
        assert user.id is not None
        assert user.email.endswith("@example.com")
        assert user.role == "user"
        assert user.is_active is True
        
        # Verify it's a valid model instance
        db.add(user)
        db.commit()
        
        # Fetch from database
        fetched_user = db.query(User).filter(User.id == user.id).first()
        assert fetched_user is not None
        assert fetched_user.email == user.email
    
    def test_customized_user_creation(self, db: Session):
        """Example: Create users with custom attributes."""
        # Create a barber with custom name
        barber = UserFactory.create_barber(
            name="John Doe",
            email="john.doe@barbershop.com"
        )
        
        assert barber.role == "barber"
        assert barber.name == "John Doe"
        assert barber.email == "john.doe@barbershop.com"
        
        # Create an admin
        admin = UserFactory.create_admin()
        assert admin.role == "admin"
    
    def test_client_variations(self, db: Session):
        """Example: Create different types of clients."""
        # New client
        new_client = ClientFactory.create_client()
        assert new_client.customer_type == "new"
        assert new_client.total_visits == 0
        
        # VIP client
        vip_client = ClientFactory.create_vip_client(
            first_name="Premium",
            last_name="Customer"
        )
        assert vip_client.customer_type == "vip"
        assert vip_client.total_visits >= 10
        assert vip_client.total_spent >= 500
        
        # At-risk client
        at_risk = ClientFactory.create_at_risk_client()
        assert at_risk.customer_type == "at_risk"
        assert at_risk.no_show_count >= 3
    
    def test_appointment_workflow(self, db: Session):
        """Example: Create appointments in different states."""
        # Create related data first
        barber = UserFactory.create_barber()
        client = ClientFactory.create_client()
        service = ServiceFactory.create_service(name="Fade Cut", base_price=35.0)
        
        db.add_all([barber, client, service])
        db.commit()
        
        # Scheduled appointment (future)
        scheduled = AppointmentFactory.create_appointment(
            user_id=barber.id,
            client_id=client.id,
            service_id=service.id,
            service_name=service.name,
            price=service.base_price
        )
        assert scheduled.status == "pending"
        assert scheduled.start_time > datetime.now(timezone.utc)
        
        # Completed appointment (past)
        completed = AppointmentFactory.create_completed_appointment(
            user_id=barber.id,
            client_id=client.id,
            service_id=service.id
        )
        assert completed.status == "completed"
        assert completed.start_time < datetime.now(timezone.utc)
        
        # No-show appointment
        no_show = AppointmentFactory.create_no_show_appointment(
            user_id=barber.id,
            client_id=client.id,
            service_id=service.id
        )
        assert no_show.status == "no_show"
    
    def test_service_hierarchy(self, db: Session):
        """Example: Create different service types."""
        # Basic service
        basic_cut = ServiceFactory.create_service(
            name="Basic Haircut",
            category="HAIRCUT",
            base_price=25.0
        )
        
        # Premium service
        premium = ServiceFactory.create_premium_service(
            name="Executive Package",
            description="Haircut, shave, and styling"
        )
        assert premium.base_price > basic_cut.base_price
        assert premium.duration_minutes > basic_cut.duration_minutes
        
        # Add-on service
        beard_trim = ServiceFactory.create_service(
            name="Beard Trim",
            category="BEARD",
            base_price=15.0,
            duration_minutes=15
        )
        
        db.add_all([basic_cut, premium, beard_trim])
        db.commit()
        
        # Verify in database
        services = db.query(Service).all()
        assert len(services) >= 3
    
    def test_payment_scenarios(self, db: Session):
        """Example: Create payments in different states."""
        # Successful payment
        success = PaymentFactory.create_payment(amount=45.0)
        assert success.status == "completed"
        assert success.stripe_payment_intent_id.startswith("pi_test_")
        
        # Pending payment
        pending = PaymentFactory.create_pending_payment(amount=30.0)
        assert pending.status == "pending"
        
        # Failed payment
        failed = PaymentFactory.create_failed_payment(
            amount=60.0
        )
        assert failed.status == "failed"
    
    def test_full_scenario_integration(self, db: Session):
        """Example: Create a complete test scenario."""
        # Create full scenario with all related data
        scenario = create_full_test_scenario(db)
        
        # Verify all components
        assert scenario['barber'].role == "barber"
        assert scenario['client'].email.endswith("@example.com")
        assert scenario['service'].is_active is True
        assert scenario['appointment'].status == "pending"
        assert len(scenario['availability']) == 7  # Full week
        
        # Verify relationships
        appointment = scenario['appointment']
        assert appointment.user_id == scenario['barber'].id
        assert appointment.client_id == scenario['client'].id
        assert appointment.service_id == scenario['service'].id
        
        # Query from database to verify persistence
        saved_appointment = db.query(Appointment).filter(
            Appointment.id == appointment.id
        ).first()
        assert saved_appointment is not None
        assert saved_appointment.service_name == scenario['service'].name
    
    def test_batch_creation(self, db: Session):
        """Example: Create multiple related instances efficiently."""
        # Create a barber
        barber = UserFactory.create_barber()
        db.add(barber)
        db.commit()
        
        # Create multiple clients
        clients = [
            ClientFactory.create_client(
                first_name=f"Client{i}",
                created_by_id=barber.id
            )
            for i in range(5)
        ]
        db.add_all(clients)
        db.commit()
        
        # Create appointments for each client
        appointments = []
        for i, client in enumerate(clients):
            appointment = AppointmentFactory.create_appointment(
                user_id=barber.id,
                client_id=client.id,
                start_time=datetime.now(timezone.utc) + timedelta(hours=i+1)
            )
            appointments.append(appointment)
        
        db.add_all(appointments)
        db.commit()
        
        # Verify
        assert db.query(Client).count() >= 5
        assert db.query(Appointment).count() >= 5
        
        # Check appointments are properly spaced
        for i in range(1, len(appointments)):
            time_diff = appointments[i].start_time - appointments[i-1].start_time
            assert abs(time_diff.total_seconds() - 3600) < 1  # 1 hour apart (with tolerance)
    
    def test_notification_setup(self, db: Session):
        """Example: Set up notification templates and preferences."""
        # Create email template
        email_template = NotificationFactory.create_notification_template(
            name="appointment_confirmation",
            subject="Your appointment is confirmed!",
            body="""
            Hi {{client_name}},
            
            Your appointment for {{service_name}} is confirmed:
            Date: {{appointment_date}}
            Time: {{appointment_time}}
            Price: ${{price}}
            
            See you soon!
            """
        )
        
        # Create SMS template
        sms_template = NotificationFactory.create_notification_template(
            name="appointment_reminder",
            template_type="sms",
            body="Reminder: {{service_name}} appointment tomorrow at {{appointment_time}}. Reply CANCEL to cancel."
        )
        
        # Create user preferences
        user = UserFactory.create_user()
        db.add(user)
        db.commit()
        
        preferences = NotificationFactory.create_notification_preferences(
            user_id=user.id,
            sms_enabled=False,  # User prefers email only
            reminder_hours=[24]  # Only 24-hour reminder
        )
        
        db.add_all([email_template, sms_template, preferences])
        db.commit()
        
        assert email_template.template_type == "email"
        assert sms_template.template_type == "sms"
        assert preferences.sms_enabled is False
        assert len(preferences.reminder_hours) == 1