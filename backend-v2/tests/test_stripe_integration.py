"""
Tests for Stripe subscription integration.

This module tests the Stripe service integration including:
- Customer creation
- Subscription management
- Payment method handling
- Webhook processing
"""

import pytest
from unittest.mock import patch, Mock, MagicMock
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from services.stripe_service import StripeSubscriptionService
from models import User, Organization, UserOrganization
from models.organization import OrganizationType


@pytest.fixture
def mock_stripe():
    """Mock stripe module"""
    with patch('services.stripe_service.stripe') as mock:
        yield mock


@pytest.fixture
def stripe_service(db_session: Session):
    """Create StripeSubscriptionService instance"""
    return StripeSubscriptionService(db_session)


@pytest.fixture
def test_user(db_session: Session):
    """Create test user"""
    user = User(
        email="test@example.com",
        name="Test User",
        unified_role="enterprise_owner",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def test_organization(db_session: Session):
    """Create test organization"""
    org = Organization(
        name="Test Barbershop",
        organization_type=OrganizationType.SINGLE_LOCATION,
        chairs_count=5,
        is_active=True
    )
    db_session.add(org)
    db_session.commit()
    return org


class TestStripeCustomerCreation:
    """Test Stripe customer creation"""
    
    def test_create_new_customer(self, stripe_service, mock_stripe, test_user, test_organization):
        """Test creating a new Stripe customer"""
        # Mock Stripe API response
        mock_customer = {
            "id": "cus_test123",
            "email": test_user.email,
            "name": test_organization.name
        }
        mock_stripe.Customer.create.return_value = mock_customer
        
        # Create customer
        result = stripe_service.create_stripe_customer(test_user, test_organization)
        
        # Verify Stripe API was called correctly
        mock_stripe.Customer.create.assert_called_once_with(
            email=test_user.email,
            name=test_organization.name,
            metadata={
                "organization_id": str(test_organization.id),
                "user_id": str(test_user.id),
                "organization_type": test_organization.organization_type
            },
            description=f"{test_organization.name} - {test_organization.chairs_count} chairs"
        )
        
        # Verify customer ID was saved
        assert test_organization.stripe_customer_id == "cus_test123"
        assert result == mock_customer
    
    def test_retrieve_existing_customer(self, stripe_service, mock_stripe, test_user, test_organization):
        """Test retrieving existing Stripe customer"""
        # Set existing customer ID
        test_organization.stripe_customer_id = "cus_existing123"
        
        # Mock Stripe API response
        mock_customer = {"id": "cus_existing123"}
        mock_stripe.Customer.retrieve.return_value = mock_customer
        
        # Create customer (should retrieve existing)
        result = stripe_service.create_stripe_customer(test_user, test_organization)
        
        # Verify retrieve was called, not create
        mock_stripe.Customer.retrieve.assert_called_once_with("cus_existing123")
        mock_stripe.Customer.create.assert_not_called()
        
        assert result == mock_customer


class TestStripeSubscription:
    """Test Stripe subscription management"""
    
    def test_create_subscription_with_trial(self, stripe_service, mock_stripe):
        """Test creating a subscription with trial period"""
        customer_id = "cus_test123"
        chairs_count = 10
        
        # Mock subscription response
        mock_subscription = {
            "id": "sub_test123",
            "customer": customer_id,
            "status": "trialing",
            "items": {
                "data": [{
                    "id": "si_test123",
                    "price": {"id": "price_test123"}
                }]
            }
        }
        mock_stripe.Subscription.create.return_value = mock_subscription
        
        # Create subscription
        result = stripe_service.create_subscription(
            customer_id=customer_id,
            chairs_count=chairs_count,
            trial_days=14
        )
        
        # Verify API call
        call_args = mock_stripe.Subscription.create.call_args[1]
        assert call_args["customer"] == customer_id
        assert call_args["trial_period_days"] == 14
        assert len(call_args["items"]) == 1
        
        # Check price data
        price_data = call_args["items"][0]["price_data"]
        assert price_data["currency"] == "usd"
        assert price_data["unit_amount"] == 1460  # $14.60 average for 10 chairs
        assert call_args["items"][0]["quantity"] == 10
        
        assert result == mock_subscription
    
    def test_update_subscription_quantity(self, stripe_service, mock_stripe):
        """Test updating subscription chair count"""
        subscription_id = "sub_test123"
        new_chairs = 15
        
        # Mock current subscription
        mock_current = {
            "id": subscription_id,
            "items": {
                "data": [{
                    "id": "si_test123"
                }]
            }
        }
        mock_stripe.Subscription.retrieve.return_value = mock_current
        
        # Mock updated subscription
        mock_updated = {
            "id": subscription_id,
            "status": "active"
        }
        mock_stripe.Subscription.modify.return_value = mock_updated
        
        # Update subscription
        result = stripe_service.update_subscription(
            subscription_id=subscription_id,
            new_chairs_count=new_chairs,
            prorate=True
        )
        
        # Verify API calls
        mock_stripe.Subscription.retrieve.assert_called_once_with(subscription_id)
        
        modify_args = mock_stripe.Subscription.modify.call_args
        assert modify_args[0][0] == subscription_id
        assert modify_args[1]["proration_behavior"] == "create_prorations"
        
        assert result == mock_updated
    
    def test_cancel_subscription_immediately(self, stripe_service, mock_stripe):
        """Test cancelling subscription immediately"""
        subscription_id = "sub_test123"
        
        mock_cancelled = {
            "id": subscription_id,
            "status": "canceled"
        }
        mock_stripe.Subscription.delete.return_value = mock_cancelled
        
        # Cancel subscription
        result = stripe_service.cancel_subscription(
            subscription_id=subscription_id,
            immediately=True
        )
        
        # Verify immediate cancellation
        mock_stripe.Subscription.delete.assert_called_once_with(subscription_id)
        mock_stripe.Subscription.modify.assert_not_called()
        
        assert result == mock_cancelled
    
    def test_cancel_subscription_at_period_end(self, stripe_service, mock_stripe):
        """Test cancelling subscription at period end"""
        subscription_id = "sub_test123"
        
        mock_cancelled = {
            "id": subscription_id,
            "status": "active",
            "cancel_at_period_end": True
        }
        mock_stripe.Subscription.modify.return_value = mock_cancelled
        
        # Cancel subscription
        result = stripe_service.cancel_subscription(
            subscription_id=subscription_id,
            immediately=False
        )
        
        # Verify cancel at period end
        mock_stripe.Subscription.modify.assert_called_once_with(
            subscription_id,
            cancel_at_period_end=True
        )
        mock_stripe.Subscription.delete.assert_not_called()
        
        assert result == mock_cancelled


class TestPaymentMethods:
    """Test payment method handling"""
    
    def test_create_setup_intent(self, stripe_service, mock_stripe):
        """Test creating a setup intent"""
        customer_id = "cus_test123"
        
        mock_setup_intent = {
            "id": "seti_test123",
            "client_secret": "seti_test123_secret_test",
            "customer": customer_id
        }
        mock_stripe.SetupIntent.create.return_value = mock_setup_intent
        
        # Create setup intent
        result = stripe_service.create_setup_intent(customer_id)
        
        # Verify API call
        mock_stripe.SetupIntent.create.assert_called_once_with(
            customer=customer_id,
            payment_method_types=["card"],
            usage="off_session",
            metadata={"purpose": "subscription_payment_method"}
        )
        
        assert result == mock_setup_intent
    
    def test_attach_payment_method(self, stripe_service, mock_stripe):
        """Test attaching payment method to customer"""
        customer_id = "cus_test123"
        payment_method_id = "pm_test123"
        
        mock_customer = {"id": customer_id}
        mock_stripe.Customer.modify.return_value = mock_customer
        
        # Attach payment method
        result = stripe_service.attach_payment_method(
            customer_id=customer_id,
            payment_method_id=payment_method_id,
            set_as_default=True
        )
        
        # Verify API calls
        mock_stripe.PaymentMethod.attach.assert_called_once_with(
            payment_method_id,
            customer=customer_id
        )
        
        mock_stripe.Customer.modify.assert_called_once_with(
            customer_id,
            invoice_settings={"default_payment_method": payment_method_id}
        )
        
        assert result == mock_customer


class TestWebhookHandling:
    """Test webhook event processing"""
    
    def test_handle_subscription_created(self, stripe_service, test_organization, db_session):
        """Test handling subscription.created webhook"""
        test_organization.stripe_customer_id = "cus_test123"
        db_session.commit()
        
        # Mock webhook event
        event = {
            "type": "customer.subscription.created",
            "data": {
                "object": {
                    "id": "sub_test123",
                    "customer": "cus_test123",
                    "status": "trialing",
                    "current_period_start": 1640995200,  # 2022-01-01
                    "current_period_end": 1643673600,    # 2022-02-01
                    "metadata": {
                        "chairs_count": "10"
                    }
                }
            }
        }
        
        # Handle webhook
        result = stripe_service.handle_subscription_webhook(event)
        
        # Verify organization was updated
        assert test_organization.stripe_subscription_id == "sub_test123"
        assert test_organization.subscription_status == "trialing"
        assert test_organization.chairs_count == 10
        assert result["status"] == "processed"
        assert result["action"] == "subscription_created"
    
    def test_handle_payment_failed(self, stripe_service, test_organization, db_session):
        """Test handling invoice.payment_failed webhook"""
        test_organization.stripe_customer_id = "cus_test123"
        test_organization.subscription_status = "active"
        db_session.commit()
        
        # Mock webhook event
        event = {
            "type": "invoice.payment_failed",
            "data": {
                "object": {
                    "customer": "cus_test123",
                    "subscription": "sub_test123"
                }
            }
        }
        
        # Handle webhook
        result = stripe_service.handle_subscription_webhook(event)
        
        # Verify status updated
        assert test_organization.subscription_status == "past_due"
        assert result["status"] == "processed"
        assert result["action"] == "payment_failed"


class TestProgressivePricing:
    """Test progressive pricing calculations in subscriptions"""
    
    @pytest.mark.parametrize("chairs,expected_total,expected_avg", [
        (1, 19.00, 19.00),
        (4, 68.00, 17.00),
        (10, 146.00, 14.60),
        (30, 334.00, 11.13),
    ])
    def test_subscription_pricing(self, stripe_service, mock_stripe, chairs, expected_total, expected_avg):
        """Test that subscriptions use correct progressive pricing"""
        customer_id = "cus_test123"
        
        # Create subscription
        stripe_service.create_subscription(
            customer_id=customer_id,
            chairs_count=chairs
        )
        
        # Verify price calculation
        call_args = mock_stripe.Subscription.create.call_args[1]
        price_data = call_args["items"][0]["price_data"]
        
        # Stripe uses cents, so multiply by 100
        assert price_data["unit_amount"] == int(expected_avg * 100)
        assert call_args["items"][0]["quantity"] == chairs
        
        # Check metadata
        assert call_args["metadata"]["chairs_count"] == str(chairs)
        assert call_args["metadata"]["monthly_total"] == str(expected_total)