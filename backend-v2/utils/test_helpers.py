"""
Comprehensive Test Utilities, Factories, and Test Data Generators

This module provides reusable test utilities, data factories, and helpers
to support comprehensive testing across all test suites with consistent
and realistic test data generation.

Features:
- Test data factories for all models
- Six Figure Barber test scenarios
- Performance monitoring utilities
- Database seeding and cleanup
- Mock service generators
- Test environment management
- Assertion helpers
"""

import random
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Any, Optional, Union
from unittest.mock import Mock, patch
import json
import time
import psutil
from faker import Faker
from sqlalchemy.orm import Session

from models import (
    User, Appointment, Service, Payment, Commission, 
    StripeAccount, Notification, BarberAvailability,
    ClientProfile, Review
)
from models.six_figure_barber_core import (
    SixFigureGoal, RevenueMetric, ClientValueScore, ServiceExcellenceMetric
)
from models.six_figure_barber_crm import (
    ClientJourney, TouchPoint, RevenueOpportunity
)
from utils.auth import get_password_hash


fake = Faker()


class TestDataFactory:
    """Factory for generating realistic test data for all models."""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self._created_objects = []
        
    def cleanup(self):
        """Clean up all created test objects."""
        for obj in reversed(self._created_objects):
            try:
                self.db.delete(obj)
            except Exception:
                pass
        self.db.commit()
        self._created_objects.clear()
    
    def _track_object(self, obj):
        """Track created object for cleanup."""
        self._created_objects.append(obj)
        return obj
    
    def create_user(self, overrides: Dict[str, Any] = None) -> User:
        """Create a test user with realistic data."""
        defaults = {
            "email": fake.email(),
            "name": fake.name(),
            "hashed_password": get_password_hash("testpass123"),
            "role": random.choice(["client", "barber", "shop_owner", "admin"]),
            "is_active": True,
            "is_verified": True,
            "phone": fake.phone_number()[:15],
            "created_at": fake.date_time_between(start_date="-1y", end_date="now")
        }
        
        if overrides:
            defaults.update(overrides)
        
        user = User(**defaults)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        return self._track_object(user)
    
    def create_barber(self, overrides: Dict[str, Any] = None) -> User:
        """Create a test barber user."""
        barber_defaults = {
            "role": "barber",
            "bio": fake.text(max_nb_chars=500),
            "specialties": json.dumps([
                random.choice(["haircuts", "beard_styling", "hair_treatment", "coloring"])
                for _ in range(random.randint(1, 3))
            ]),
            "years_experience": random.randint(1, 20),
            "rating": round(random.uniform(3.5, 5.0), 1),
            "six_figure_enrolled": random.choice([True, False]),
            "six_figure_tier": random.choice(["STARTER", "GROWTH", "MASTERY", "ELITE"]) if random.choice([True, False]) else None
        }
        
        if overrides:
            barber_defaults.update(overrides)
        
        return self.create_user(barber_defaults)
    
    def create_client(self, overrides: Dict[str, Any] = None) -> User:
        """Create a test client user."""
        client_defaults = {
            "role": "client",
            "client_tier": random.choice(["BRONZE", "SILVER", "GOLD", "PLATINUM"]),
            "total_spent": Decimal(str(round(random.uniform(0, 5000), 2))),
            "visit_frequency": random.randint(1, 12),
            "last_visit": fake.date_time_between(start_date="-6m", end_date="now")
        }
        
        if overrides:
            client_defaults.update(overrides)
        
        return self.create_user(client_defaults)
    
    def create_shop_owner(self, overrides: Dict[str, Any] = None) -> User:
        """Create a test shop owner user."""
        owner_defaults = {
            "role": "shop_owner",
            "shop_name": fake.company(),
            "shop_address": fake.address().replace('\n', ', '),
            "business_license": fake.uuid4(),
            "tax_id": fake.uuid4()[:12]
        }
        
        if overrides:
            owner_defaults.update(overrides)
        
        return self.create_user(owner_defaults)
    
    def create_service(self, overrides: Dict[str, Any] = None) -> Service:
        """Create a test service."""
        service_types = [
            {"name": "Premium Haircut", "price": 95.00, "duration": 60, "category": "haircut"},
            {"name": "Basic Haircut", "price": 65.00, "duration": 45, "category": "haircut"},
            {"name": "Beard Styling", "price": 45.00, "duration": 30, "category": "beard"},
            {"name": "Hair Treatment", "price": 75.00, "duration": 45, "category": "treatment"},
            {"name": "Hot Towel Shave", "price": 55.00, "duration": 35, "category": "shave"},
            {"name": "Hair Coloring", "price": 125.00, "duration": 90, "category": "coloring"}
        ]
        
        selected_service = random.choice(service_types)
        
        defaults = {
            "name": selected_service["name"],
            "description": fake.text(max_nb_chars=200),
            "price": Decimal(str(selected_service["price"])),
            "duration": selected_service["duration"],
            "category": selected_service["category"],
            "is_active": True,
            "six_figure_service": random.choice([True, False]),
            "requires_consultation": random.choice([True, False])
        }
        
        if overrides:
            defaults.update(overrides)
        
        service = Service(**defaults)
        self.db.add(service)
        self.db.commit()
        self.db.refresh(service)
        
        return self._track_object(service)
    
    def create_appointment(self, overrides: Dict[str, Any] = None) -> Appointment:
        """Create a test appointment."""
        defaults = {
            "barber_id": self.create_barber().id,
            "client_id": self.create_client().id,
            "service_id": self.create_service().id,
            "appointment_datetime": fake.date_time_between(start_date="-30d", end_date="+30d"),
            "status": random.choice(["pending", "confirmed", "completed", "cancelled"]),
            "price": Decimal(str(round(random.uniform(45.00, 125.00), 2))),
            "notes": fake.text(max_nb_chars=100) if random.choice([True, False]) else None,
            "created_at": fake.date_time_between(start_date="-60d", end_date="now")
        }
        
        if overrides:
            defaults.update(overrides)
        
        appointment = Appointment(**defaults)
        self.db.add(appointment)
        self.db.commit()
        self.db.refresh(appointment)
        
        return self._track_object(appointment)
    
    def create_payment(self, overrides: Dict[str, Any] = None) -> Payment:
        """Create a test payment."""
        appointment = self.create_appointment({"status": "completed"})
        
        defaults = {
            "appointment_id": appointment.id,
            "stripe_payment_intent_id": f"pi_test_{fake.uuid4()[:12]}",
            "amount": appointment.price,
            "status": "succeeded",
            "payment_method": "card",
            "created_at": fake.date_time_between(start_date="-30d", end_date="now")
        }
        
        if overrides:
            defaults.update(overrides)
        
        payment = Payment(**defaults)
        self.db.add(payment)
        self.db.commit()
        self.db.refresh(payment)
        
        return self._track_object(payment)
    
    def create_commission(self, overrides: Dict[str, Any] = None) -> Commission:
        """Create a test commission."""
        payment = self.create_payment()
        
        # Calculate commission based on Six Figure tier
        barber = self.db.query(User).filter(User.id == payment.appointment.barber_id).first()
        commission_rates = {
            "STARTER": 0.85,
            "GROWTH": 0.90,
            "MASTERY": 0.93,
            "ELITE": 0.95
        }
        
        rate = commission_rates.get(getattr(barber, 'six_figure_tier', None), 0.85)
        
        defaults = {
            "payment_id": payment.id,
            "barber_id": payment.appointment.barber_id,
            "total_amount": payment.amount,
            "barber_amount": payment.amount * Decimal(str(rate)),
            "platform_fee": payment.amount * Decimal(str(1 - rate)),
            "status": "processed",
            "created_at": fake.date_time_between(start_date="-30d", end_date="now")
        }
        
        if overrides:
            defaults.update(overrides)
        
        commission = Commission(**defaults)
        self.db.add(commission)
        self.db.commit()
        self.db.refresh(commission)
        
        return self._track_object(commission)
    
    def create_six_figure_goal(self, barber_id: int, overrides: Dict[str, Any] = None) -> SixFigureGoal:
        """Create a Six Figure Barber goal."""
        defaults = {
            "barber_id": barber_id,
            "goal_type": random.choice(["ANNUAL_REVENUE", "MONTHLY_REVENUE", "CLIENT_COUNT", "SERVICE_EXCELLENCE"]),
            "target_amount": Decimal(str(random.randint(100000, 200000))),
            "target_date": fake.date_time_between(start_date="now", end_date="+1y"),
            "current_progress": Decimal(str(random.randint(0, 50000))),
            "milestone_amount": Decimal(str(random.randint(5000, 15000))),
            "is_active": True,
            "created_at": fake.date_time_between(start_date="-30d", end_date="now")
        }
        
        if overrides:
            defaults.update(overrides)
        
        goal = SixFigureGoal(**defaults)
        self.db.add(goal)
        self.db.commit()
        self.db.refresh(goal)
        
        return self._track_object(goal)
    
    def create_client_value_score(self, client_id: int, overrides: Dict[str, Any] = None) -> ClientValueScore:
        """Create a client value score."""
        defaults = {
            "client_id": client_id,
            "value_score": round(random.uniform(60.0, 100.0), 1),
            "tier": random.choice(["BRONZE", "SILVER", "GOLD", "PLATINUM"]),
            "lifetime_value": Decimal(str(round(random.uniform(500, 5000), 2))),
            "retention_probability": round(random.uniform(0.7, 0.95), 2),
            "last_updated": fake.date_time_between(start_date="-7d", end_date="now")
        }
        
        if overrides:
            defaults.update(overrides)
        
        score = ClientValueScore(**defaults)
        self.db.add(score)
        self.db.commit()
        self.db.refresh(score)
        
        return self._track_object(score)


class SixFigureBarberTestScenarios:
    """Predefined test scenarios for Six Figure Barber methodology."""
    
    def __init__(self, factory: TestDataFactory):
        self.factory = factory
    
    def create_complete_six_figure_scenario(self) -> Dict[str, Any]:
        """Create a complete Six Figure Barber test scenario."""
        
        # Create Six Figure enrolled barber
        barber = self.factory.create_barber({
            "six_figure_enrolled": True,
            "six_figure_tier": "GROWTH",
            "years_experience": 8,
            "rating": 4.8
        })
        
        # Create diverse client base
        clients = []
        for tier in ["BRONZE", "SILVER", "GOLD", "PLATINUM"]:
            for i in range(3):  # 3 clients per tier
                client = self.factory.create_client({
                    "client_tier": tier,
                    "total_spent": Decimal(str({
                        "BRONZE": random.uniform(100, 500),
                        "SILVER": random.uniform(500, 1500),
                        "GOLD": random.uniform(1500, 3000),
                        "PLATINUM": random.uniform(3000, 8000)
                    }[tier])),
                    "visit_frequency": {
                        "BRONZE": random.randint(1, 3),
                        "SILVER": random.randint(3, 6),
                        "GOLD": random.randint(6, 10),
                        "PLATINUM": random.randint(10, 12)
                    }[tier]
                })
                clients.append(client)
        
        # Create premium services
        services = []
        for service_data in [
            {"name": "Signature Six Figure Cut", "price": 150.00, "duration": 75, "six_figure_service": True},
            {"name": "Executive Styling", "price": 125.00, "duration": 60, "six_figure_service": True},
            {"name": "Premium Beard Design", "price": 85.00, "duration": 45, "six_figure_service": True}
        ]:
            service = self.factory.create_service(service_data)
            services.append(service)
        
        # Create appointment history (past 6 months)
        appointments = []
        for client in clients:
            num_appointments = client.visit_frequency // 2  # 6 months worth
            for i in range(num_appointments):
                appointment_date = fake.date_time_between(start_date="-6m", end_date="-1d")
                service = random.choice(services)
                
                appointment = self.factory.create_appointment({
                    "barber_id": barber.id,
                    "client_id": client.id,
                    "service_id": service.id,
                    "appointment_datetime": appointment_date,
                    "status": "completed",
                    "price": service.price
                })
                appointments.append(appointment)
        
        # Create payments and commissions
        payments = []
        commissions = []
        for appointment in appointments:
            payment = self.factory.create_payment({
                "appointment_id": appointment.id,
                "amount": appointment.price,
                "status": "succeeded"
            })
            payments.append(payment)
            
            commission = self.factory.create_commission({
                "payment_id": payment.id,
                "barber_id": barber.id
            })
            commissions.append(commission)
        
        # Create Six Figure goals
        goals = [
            self.factory.create_six_figure_goal(barber.id, {
                "goal_type": "ANNUAL_REVENUE",
                "target_amount": Decimal("150000.00"),
                "current_progress": sum(p.amount for p in payments)
            }),
            self.factory.create_six_figure_goal(barber.id, {
                "goal_type": "CLIENT_COUNT",
                "target_amount": Decimal("200"),
                "current_progress": Decimal(str(len(clients)))
            })
        ]
        
        # Create client value scores
        value_scores = []
        for client in clients:
            score = self.factory.create_client_value_score(client.id, {
                "tier": client.client_tier
            })
            value_scores.append(score)
        
        return {
            "barber": barber,
            "clients": clients,
            "services": services,
            "appointments": appointments,
            "payments": payments,
            "commissions": commissions,
            "goals": goals,
            "value_scores": value_scores,
            "total_revenue": sum(p.amount for p in payments),
            "average_service_value": sum(p.amount for p in payments) / len(payments) if payments else Decimal("0")
        }
    
    def create_struggling_barber_scenario(self) -> Dict[str, Any]:
        """Create a scenario for a barber struggling to reach Six Figure status."""
        
        barber = self.factory.create_barber({
            "six_figure_enrolled": True,
            "six_figure_tier": "STARTER",
            "years_experience": 3,
            "rating": 4.2
        })
        
        # Fewer, lower-value clients
        clients = []
        for i in range(8):  # Only 8 clients
            client = self.factory.create_client({
                "client_tier": random.choice(["BRONZE", "SILVER"]),
                "total_spent": Decimal(str(random.uniform(50, 300))),
                "visit_frequency": random.randint(1, 4)
            })
            clients.append(client)
        
        # Basic services only
        services = [
            self.factory.create_service({
                "name": "Basic Haircut",
                "price": 45.00,
                "duration": 30,
                "six_figure_service": False
            }),
            self.factory.create_service({
                "name": "Beard Trim",
                "price": 25.00,
                "duration": 20,
                "six_figure_service": False
            })
        ]
        
        # Limited appointment history
        appointments = []
        for client in clients:
            for i in range(random.randint(2, 5)):  # 2-5 appointments each
                appointment = self.factory.create_appointment({
                    "barber_id": barber.id,
                    "client_id": client.id,
                    "service_id": random.choice(services).id,
                    "status": "completed",
                    "price": random.choice([Decimal("45.00"), Decimal("25.00")])
                })
                appointments.append(appointment)
        
        # Ambitious goal vs. reality
        goal = self.factory.create_six_figure_goal(barber.id, {
            "goal_type": "ANNUAL_REVENUE",
            "target_amount": Decimal("100000.00"),
            "current_progress": Decimal("15000.00")  # Far behind
        })
        
        return {
            "barber": barber,
            "clients": clients,
            "services": services,
            "appointments": appointments,
            "goal": goal,
            "improvement_opportunities": [
                "Increase service prices",
                "Add premium services",
                "Improve client retention",
                "Expand client base"
            ]
        }


class PerformanceMonitor:
    """Monitor performance metrics during tests."""
    
    def __init__(self, track_queries: bool = False):
        self.metrics = {}
        self.start_time = None
        self.track_queries = track_queries
        self.query_count = 0
        
    def start_timing(self, operation_name: str):
        """Start timing an operation."""
        self.start_time = time.time()
        self.current_operation = operation_name
        
        if self.track_queries:
            self.query_count = 0
    
    def end_timing(self) -> float:
        """End timing and record the metric."""
        if self.start_time is None:
            return 0.0
        
        duration = (time.time() - self.start_time) * 1000  # Convert to milliseconds
        self.log_metric(self.current_operation, duration)
        self.start_time = None
        
        return duration
    
    def log_metric(self, metric_name: str, value: float):
        """Log a performance metric."""
        if metric_name not in self.metrics:
            self.metrics[metric_name] = []
        
        self.metrics[metric_name].append({
            "value": value,
            "timestamp": datetime.now().isoformat(),
            "query_count": self.query_count if self.track_queries else None
        })
    
    def get_metric_summary(self, metric_name: str) -> Dict[str, float]:
        """Get summary statistics for a metric."""
        if metric_name not in self.metrics:
            return {}
        
        values = [m["value"] for m in self.metrics[metric_name]]
        
        return {
            "count": len(values),
            "min": min(values),
            "max": max(values),
            "average": sum(values) / len(values),
            "total": sum(values)
        }
    
    def get_memory_usage(self) -> Dict[str, float]:
        """Get current memory usage."""
        process = psutil.Process()
        memory_info = process.memory_info()
        
        return {
            "rss_mb": memory_info.rss / 1024 / 1024,
            "vms_mb": memory_info.vms / 1024 / 1024,
            "percent": process.memory_percent()
        }
    
    def export_metrics(self, filename: str):
        """Export metrics to JSON file."""
        export_data = {
            "metrics": self.metrics,
            "memory_usage": self.get_memory_usage(),
            "export_time": datetime.now().isoformat()
        }
        
        with open(filename, 'w') as f:
            json.dump(export_data, f, indent=2, default=str)


class MockServiceGenerator:
    """Generate mock services for testing external dependencies."""
    
    @staticmethod
    def create_mock_stripe_service():
        """Create mock Stripe service."""
        mock_stripe = Mock()
        
        # Mock payment intent creation
        mock_stripe.PaymentIntent.create.return_value = Mock(
            id="pi_test_123",
            client_secret="pi_test_123_secret",
            status="requires_payment_method",
            amount=9500,
            currency="usd"
        )
        
        # Mock payment confirmation
        mock_stripe.PaymentIntent.confirm.return_value = Mock(
            id="pi_test_123",
            status="succeeded",
            charges=Mock(data=[Mock(
                id="ch_test_123",
                amount=9500,
                application_fee_amount=950
            )])
        )
        
        # Mock refund creation
        mock_stripe.Refund.create.return_value = Mock(
            id="re_test_123",
            amount=9500,
            status="succeeded"
        )
        
        return mock_stripe
    
    @staticmethod
    def create_mock_notification_service():
        """Create mock notification service."""
        mock_notifications = Mock()
        
        mock_notifications.send_email.return_value = {
            "success": True,
            "message_id": "msg_test_123"
        }
        
        mock_notifications.send_sms.return_value = {
            "success": True,
            "message_id": "sms_test_123"
        }
        
        mock_notifications.send_push_notification.return_value = {
            "success": True,
            "message_id": "push_test_123"
        }
        
        return mock_notifications
    
    @staticmethod
    def create_mock_analytics_service():
        """Create mock analytics service."""
        mock_analytics = Mock()
        
        mock_analytics.track_event.return_value = {"success": True}
        mock_analytics.track_revenue.return_value = {"success": True}
        mock_analytics.track_conversion.return_value = {"success": True}
        
        return mock_analytics


class TestEnvironmentManager:
    """Manage test environment setup and cleanup."""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.factory = TestDataFactory(db_session)
        self.created_data = []
    
    def setup_basic_environment(self) -> Dict[str, Any]:
        """Setup basic test environment with essential data."""
        
        # Create basic services
        services = [
            self.factory.create_service({
                "name": "Basic Haircut",
                "price": 45.00,
                "duration": 30
            }),
            self.factory.create_service({
                "name": "Premium Haircut",
                "price": 95.00,
                "duration": 60,
                "six_figure_service": True
            })
        ]
        
        # Create test users
        admin = self.factory.create_user({
            "role": "admin",
            "email": "admin@test.com"
        })
        
        barber = self.factory.create_barber({
            "email": "barber@test.com",
            "six_figure_enrolled": True
        })
        
        client = self.factory.create_client({
            "email": "client@test.com"
        })
        
        shop_owner = self.factory.create_shop_owner({
            "email": "owner@test.com"
        })
        
        return {
            "services": services,
            "users": {
                "admin": admin,
                "barber": barber,
                "client": client,
                "shop_owner": shop_owner
            }
        }
    
    def setup_six_figure_environment(self) -> Dict[str, Any]:
        """Setup Six Figure Barber test environment."""
        scenarios = SixFigureBarberTestScenarios(self.factory)
        return scenarios.create_complete_six_figure_scenario()
    
    def cleanup_environment(self):
        """Clean up test environment."""
        self.factory.cleanup()


class AssertionHelpers:
    """Custom assertion helpers for BookedBarber tests."""
    
    @staticmethod
    def assert_valid_six_figure_metrics(metrics: Dict[str, Any]):
        """Assert Six Figure metrics are valid."""
        required_fields = ["total_revenue", "appointment_count", "client_count", "average_service_value"]
        
        for field in required_fields:
            assert field in metrics, f"Missing required field: {field}"
        
        assert metrics["total_revenue"] >= 0, "Revenue cannot be negative"
        assert metrics["appointment_count"] >= 0, "Appointment count cannot be negative"
        assert metrics["client_count"] >= 0, "Client count cannot be negative"
        
        if metrics["appointment_count"] > 0:
            expected_avg = metrics["total_revenue"] / metrics["appointment_count"]
            assert abs(float(metrics["average_service_value"]) - float(expected_avg)) < 0.01
    
    @staticmethod
    def assert_valid_booking_flow(booking_data: Dict[str, Any]):
        """Assert booking flow data is valid."""
        required_fields = ["barber_id", "client_id", "service_id", "appointment_datetime", "price"]
        
        for field in required_fields:
            assert field in booking_data, f"Missing required field: {field}"
        
        assert booking_data["price"] > 0, "Price must be positive"
        assert booking_data["appointment_datetime"] > datetime.now(), "Appointment must be in future"
    
    @staticmethod
    def assert_valid_payment_data(payment_data: Dict[str, Any]):
        """Assert payment data is valid."""
        required_fields = ["amount", "status", "payment_method"]
        
        for field in required_fields:
            assert field in payment_data, f"Missing required field: {field}"
        
        assert payment_data["amount"] > 0, "Payment amount must be positive"
        assert payment_data["status"] in ["pending", "succeeded", "failed", "cancelled"]
        
        if payment_data["status"] == "succeeded":
            assert "transaction_id" in payment_data or "stripe_payment_intent_id" in payment_data


# Convenience function for quick test setup
def quick_test_setup(db_session: Session) -> Tuple[TestDataFactory, TestEnvironmentManager]:
    """Quick setup for test factories and environment."""
    factory = TestDataFactory(db_session)
    env_manager = TestEnvironmentManager(db_session)
    return factory, env_manager