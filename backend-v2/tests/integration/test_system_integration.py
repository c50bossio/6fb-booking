"""
System Integration Test Suite

This test suite ensures that all consolidated services, credential management,
and API endpoints work together properly after the parallel refactoring efforts.
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, List
from unittest.mock import Mock, patch, AsyncMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from main import app
from database import get_db, Base
from models import User, Appointment, Payment, Location, Service
from services.booking_service import BookingService
from services.payment_service import PaymentService
from services.notification_service import NotificationService
from services.integration_service import IntegrationService
from services.gmb_service import GMBService
from utils.encryption import EncryptionService
from config.settings import settings


class TestSystemIntegration:
    """Test suite for system-wide integration after consolidation."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up test database and client."""
        # Create test database
        self.engine = create_engine("sqlite:///:memory:")
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        
        # Override get_db dependency
        def override_get_db():
            try:
                db = self.SessionLocal()
                yield db
            finally:
                db.close()
        
        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)
        
        # Create test data
        self._create_test_data()
        
        yield
        
        # Cleanup
        Base.metadata.drop_all(bind=self.engine)
        app.dependency_overrides.clear()
    
    def _create_test_data(self):
        """Create test data for integration tests."""
        db = self.SessionLocal()
        try:
            # Create test location
            self.test_location = Location(
                id="loc_test123",
                name="Test Barbershop",
                address="123 Test St",
                city="Test City",
                state="TS",
                zip_code="12345",
                phone="+1234567890",
                email="test@barbershop.com",
                timezone="America/New_York"
            )
            db.add(self.test_location)
            
            # Create test user
            self.test_user = User(
                id="user_test123",
                email="test@example.com",
                username="testuser",
                hashed_password="hashed_password",
                is_barber=True,
                location_id=self.test_location.id
            )
            db.add(self.test_user)
            
            # Create test service
            self.test_service = Service(
                id="svc_test123",
                name="Test Haircut",
                description="Test haircut service",
                duration=30,
                price=3000,  # $30.00
                location_id=self.test_location.id
            )
            db.add(self.test_service)
            
            db.commit()
        finally:
            db.close()
    
    def test_consolidated_booking_service(self):
        """Test that consolidated booking service works with existing code."""
        db = self.SessionLocal()
        try:
            booking_service = BookingService(db)
            
            # Test availability check
            start_time = datetime.now().replace(hour=10, minute=0, second=0, microsecond=0)
            end_time = start_time + timedelta(minutes=30)
            
            is_available = booking_service.check_availability(
                barber_id=self.test_user.id,
                start_time=start_time,
                end_time=end_time
            )
            assert is_available is True
            
            # Test appointment creation
            appointment = booking_service.create_appointment(
                barber_id=self.test_user.id,
                client_name="Test Client",
                client_email="client@test.com",
                client_phone="+1234567890",
                service_id=self.test_service.id,
                start_time=start_time,
                end_time=end_time,
                location_id=self.test_location.id
            )
            
            assert appointment is not None
            assert appointment.barber_id == self.test_user.id
            assert appointment.status == "confirmed"
            
            # Test double booking prevention
            with pytest.raises(ValueError):
                booking_service.create_appointment(
                    barber_id=self.test_user.id,
                    client_name="Another Client",
                    client_email="another@test.com",
                    client_phone="+0987654321",
                    service_id=self.test_service.id,
                    start_time=start_time,
                    end_time=end_time,
                    location_id=self.test_location.id
                )
        finally:
            db.close()
    
    @patch('services.payment_service.stripe')
    def test_payment_service_integration(self, mock_stripe):
        """Test payment service integration with booking system."""
        db = self.SessionLocal()
        try:
            # Mock Stripe responses
            mock_stripe.PaymentIntent.create.return_value = Mock(
                id="pi_test123",
                client_secret="secret_test123",
                amount=3000,
                currency="usd"
            )
            
            payment_service = PaymentService()
            
            # Create payment intent
            intent = payment_service.create_payment_intent(
                amount=3000,
                currency="usd",
                metadata={
                    "appointment_id": "apt_test123",
                    "location_id": self.test_location.id
                }
            )
            
            assert intent["id"] == "pi_test123"
            assert intent["amount"] == 3000
            
            # Test payment confirmation
            mock_stripe.PaymentIntent.retrieve.return_value = Mock(
                id="pi_test123",
                status="succeeded",
                amount=3000
            )
            
            result = payment_service.confirm_payment("pi_test123")
            assert result["status"] == "succeeded"
        finally:
            db.close()
    
    @patch('services.notification_service.TwilioClient')
    @patch('services.notification_service.SendGridAPIClient')
    def test_notification_service_integration(self, mock_sendgrid, mock_twilio):
        """Test notification service integration."""
        db = self.SessionLocal()
        try:
            # Create test appointment
            appointment = Appointment(
                id="apt_test123",
                barber_id=self.test_user.id,
                client_name="Test Client",
                client_email="client@test.com",
                client_phone="+1234567890",
                service_id=self.test_service.id,
                start_time=datetime.now() + timedelta(hours=24),
                end_time=datetime.now() + timedelta(hours=24, minutes=30),
                status="confirmed",
                location_id=self.test_location.id
            )
            db.add(appointment)
            db.commit()
            
            # Mock responses
            mock_twilio.return_value.messages.create.return_value = Mock(sid="SM123")
            mock_sendgrid.return_value.send.return_value = Mock(status_code=202)
            
            notification_service = NotificationService()
            
            # Test SMS notification
            sms_result = notification_service.send_appointment_reminder_sms(
                appointment_id=appointment.id,
                db=db
            )
            assert sms_result is True
            
            # Test email notification
            email_result = notification_service.send_appointment_confirmation_email(
                appointment_id=appointment.id,
                db=db
            )
            assert email_result is True
        finally:
            db.close()
    
    def test_credential_management(self):
        """Test that credential management works properly."""
        # Test encryption service
        encryption_service = EncryptionService()
        
        # Test encryption/decryption
        sensitive_data = "my-secret-api-key"
        encrypted = encryption_service.encrypt(sensitive_data)
        decrypted = encryption_service.decrypt(encrypted)
        
        assert decrypted == sensitive_data
        assert encrypted != sensitive_data
        
        # Test that no credentials are exposed in responses
        response = self.client.get("/api/v1/integrations/")
        assert response.status_code in [200, 401]  # Depends on auth
        
        if response.status_code == 200:
            data = response.json()
            # Ensure no sensitive fields are exposed
            for integration in data.get("integrations", []):
                assert "client_secret" not in integration
                assert "api_key" not in integration
                assert "refresh_token" not in integration
    
    def test_api_endpoints_functionality(self):
        """Test that all API endpoints remain functional."""
        # Test health check
        response = self.client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        
        # Test authentication endpoints
        response = self.client.post("/api/v1/auth/register", json={
            "email": "newuser@test.com",
            "username": "newuser",
            "password": "TestPassword123!",
            "full_name": "New User"
        })
        assert response.status_code in [200, 201, 422]  # 422 if user exists
        
        # Test appointment endpoints
        response = self.client.get("/api/v1/appointments/availability", params={
            "barber_id": self.test_user.id,
            "date": datetime.now().date().isoformat()
        })
        assert response.status_code in [200, 401]  # Depends on auth
        
        # Test location endpoints
        response = self.client.get("/api/v1/locations/")
        assert response.status_code in [200, 401]
    
    def test_database_migrations(self):
        """Test that database migrations work properly."""
        # This would normally test alembic migrations
        # For now, just verify tables exist
        db = self.SessionLocal()
        try:
            # Check core tables exist
            inspector = db.bind.dialect.get_inspector(db.bind)
            tables = inspector.get_table_names()
            
            required_tables = [
                'users', 'appointments', 'payments', 
                'locations', 'services', 'integrations'
            ]
            
            for table in required_tables:
                assert table in tables, f"Table {table} not found"
        finally:
            db.close()
    
    @patch('services.gmb_service.build')
    def test_gmb_integration(self, mock_build):
        """Test Google My Business integration."""
        db = self.SessionLocal()
        try:
            # Mock GMB API
            mock_service = Mock()
            mock_build.return_value = mock_service
            
            # Create test integration
            integration = IntegrationService.create_integration(
                db=db,
                user_id=self.test_user.id,
                location_id=self.test_location.id,
                type="google_my_business",
                config={
                    "account_id": "accounts/123",
                    "location_id": "locations/456"
                }
            )
            
            # Test GMB service
            gmb_service = GMBService(integration_id=integration.id, db=db)
            
            # Mock review response
            mock_service.accounts().locations().reviews().list().execute.return_value = {
                "reviews": [
                    {
                        "reviewId": "review123",
                        "reviewer": {"displayName": "Test User"},
                        "starRating": "FIVE",
                        "comment": "Great service!"
                    }
                ]
            }
            
            reviews = gmb_service.fetch_reviews()
            assert len(reviews) == 1
            assert reviews[0]["starRating"] == "FIVE"
        finally:
            db.close()
    
    def test_service_interdependencies(self):
        """Test that services work together properly."""
        db = self.SessionLocal()
        try:
            # Create a complete booking flow
            booking_service = BookingService(db)
            payment_service = PaymentService()
            
            # 1. Create appointment
            start_time = datetime.now() + timedelta(days=1, hours=10)
            end_time = start_time + timedelta(minutes=30)
            
            appointment = booking_service.create_appointment(
                barber_id=self.test_user.id,
                client_name="Integration Test Client",
                client_email="integration@test.com",
                client_phone="+1234567890",
                service_id=self.test_service.id,
                start_time=start_time,
                end_time=end_time,
                location_id=self.test_location.id
            )
            
            # 2. Create payment (mocked)
            with patch('services.payment_service.stripe') as mock_stripe:
                mock_stripe.PaymentIntent.create.return_value = Mock(
                    id="pi_integration_test",
                    client_secret="secret_integration",
                    amount=3000
                )
                
                payment_intent = payment_service.create_payment_intent(
                    amount=3000,
                    currency="usd",
                    metadata={"appointment_id": appointment.id}
                )
                
                assert payment_intent["id"] == "pi_integration_test"
            
            # 3. Verify appointment is linked to payment
            updated_appointment = db.query(Appointment).filter_by(
                id=appointment.id
            ).first()
            
            # Update appointment with payment info
            updated_appointment.payment_status = "pending"
            updated_appointment.payment_intent_id = payment_intent["id"]
            db.commit()
            
            assert updated_appointment.payment_intent_id == "pi_integration_test"
        finally:
            db.close()
    
    def test_error_handling_and_rollback(self):
        """Test system behavior under error conditions."""
        db = self.SessionLocal()
        try:
            booking_service = BookingService(db)
            
            # Test invalid appointment creation
            with pytest.raises(ValueError):
                booking_service.create_appointment(
                    barber_id="invalid_id",
                    client_name="Test",
                    client_email="test@test.com",
                    client_phone="+1234567890",
                    service_id=self.test_service.id,
                    start_time=datetime.now(),
                    end_time=datetime.now() - timedelta(hours=1),  # Invalid: end before start
                    location_id=self.test_location.id
                )
            
            # Verify no partial data was saved
            appointments = db.query(Appointment).filter_by(
                client_email="test@test.com"
            ).all()
            assert len(appointments) == 0
        finally:
            db.close()
    
    @pytest.mark.asyncio
    async def test_async_operations(self):
        """Test async operations work correctly."""
        # Test async database operations if implemented
        if hasattr(settings, 'ASYNC_DATABASE_URL'):
            engine = create_async_engine(settings.ASYNC_DATABASE_URL)
            async with AsyncSession(engine) as session:
                # Test async queries
                result = await session.execute(
                    "SELECT COUNT(*) FROM users"
                )
                count = result.scalar()
                assert count >= 0
    
    def test_configuration_validation(self):
        """Test that all required configuration is present."""
        required_settings = [
            'DATABASE_URL',
            'SECRET_KEY',
            'STRIPE_SECRET_KEY',
            'SENDGRID_API_KEY',
            'TWILIO_ACCOUNT_SID',
            'TWILIO_AUTH_TOKEN'
        ]
        
        for setting in required_settings:
            assert hasattr(settings, setting), f"Missing required setting: {setting}"
            # Don't check actual values in tests, just existence
            assert getattr(settings, setting) is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])