"""
Stripe subscription service for chair-based billing.

This service handles all Stripe subscription operations including:
- Customer creation
- Subscription management with progressive pricing
- Payment method handling
- Webhook event processing
"""

import stripe
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import logging

from models import User, Organization
from config import settings
from utils.pricing import calculate_progressive_price

# Configure Stripe
stripe.api_key = settings.stripe_secret_key

logger = logging.getLogger(__name__)


class StripeSubscriptionService:
    """Service for managing Stripe subscriptions with chair-based pricing"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_stripe_customer(self, user: User, organization: Organization) -> Dict[str, Any]:
        """
        Create a Stripe customer for the organization.
        
        Args:
            user: The primary user/owner
            organization: The organization to bill
            
        Returns:
            Stripe customer object
        """
        try:
            # Check if customer already exists
            if organization.stripe_customer_id:
                return stripe.Customer.retrieve(organization.stripe_customer_id)
            
            # Create new customer
            customer = stripe.Customer.create(
                email=user.email,
                name=organization.name,
                metadata={
                    "organization_id": str(organization.id),
                    "user_id": str(user.id),
                    "organization_type": organization.organization_type
                },
                description=f"{organization.name} - {organization.chairs_count} chairs"
            )
            
            # Save customer ID
            organization.stripe_customer_id = customer.id
            self.db.commit()
            
            logger.info(f"Created Stripe customer {customer.id} for organization {organization.id}")
            return customer
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating customer: {str(e)}")
            raise
    
    def create_subscription(
        self, 
        customer_id: str, 
        chairs_count: int,
        trial_days: int = 14,
        payment_method_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a Stripe subscription with progressive chair-based pricing.
        
        Uses Stripe's "per unit" pricing model where quantity = number of chairs.
        The actual price per chair is calculated on our side based on progressive brackets.
        
        Args:
            customer_id: Stripe customer ID
            chairs_count: Number of chairs to bill for
            trial_days: Free trial period (default 14)
            payment_method_id: Payment method to attach
            
        Returns:
            Stripe subscription object
        """
        try:
            # Calculate progressive pricing
            pricing = calculate_progressive_price(chairs_count)
            
            # If payment method provided, attach it as default
            if payment_method_id:
                stripe.PaymentMethod.attach(
                    payment_method_id,
                    customer=customer_id
                )
                stripe.Customer.modify(
                    customer_id,
                    invoice_settings={"default_payment_method": payment_method_id}
                )
            
            # Create subscription with custom price data
            # Using average price per chair for simplicity in Stripe
            subscription = stripe.Subscription.create(
                customer=customer_id,
                items=[{
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": int(pricing["average_per_chair"] * 100),  # Convert to cents
                        "recurring": {"interval": "month"},
                        "product_data": {
                            "name": f"BookedBarber {pricing['tier_name']}",
                            "metadata": {
                                "tier": pricing["tier_name"],
                                "progressive_pricing": "true"
                            }
                        }
                    },
                    "quantity": chairs_count
                }],
                trial_period_days=trial_days,
                metadata={
                    "chairs_count": str(chairs_count),
                    "monthly_total": str(pricing["total_price"]),
                    "tier_name": pricing["tier_name"]
                },
                # Ensure subscription continues even if first payment fails (during trial)
                payment_settings={
                    "payment_method_types": ["card"],
                    "save_default_payment_method": "on_subscription"
                },
                trial_settings={
                    "end_behavior": {
                        "missing_payment_method": "pause"  # Pause if no payment method after trial
                    }
                }
            )
            
            logger.info(
                f"Created Stripe subscription {subscription.id} "
                f"for customer {customer_id} with {chairs_count} chairs"
            )
            return subscription
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating subscription: {str(e)}")
            raise
    
    def update_subscription(
        self, 
        subscription_id: str, 
        new_chairs_count: int,
        prorate: bool = True
    ) -> Dict[str, Any]:
        """
        Update subscription quantity (number of chairs).
        
        Args:
            subscription_id: Stripe subscription ID
            new_chairs_count: New number of chairs
            prorate: Whether to prorate the change
            
        Returns:
            Updated subscription object
        """
        try:
            # Retrieve current subscription
            subscription = stripe.Subscription.retrieve(subscription_id)
            
            # Calculate new progressive pricing
            new_pricing = calculate_progressive_price(new_chairs_count)
            
            # Update the subscription item with new quantity and price
            subscription_item = subscription["items"]["data"][0]
            
            # Modify subscription with new price data
            updated_subscription = stripe.Subscription.modify(
                subscription_id,
                items=[{
                    "id": subscription_item.id,
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": int(new_pricing["average_per_chair"] * 100),
                        "recurring": {"interval": "month"},
                        "product_data": {
                            "name": f"BookedBarber {new_pricing['tier_name']}",
                            "metadata": {
                                "tier": new_pricing["tier_name"],
                                "progressive_pricing": "true"
                            }
                        }
                    },
                    "quantity": new_chairs_count
                }],
                proration_behavior="create_prorations" if prorate else "none",
                metadata={
                    "chairs_count": str(new_chairs_count),
                    "monthly_total": str(new_pricing["total_price"]),
                    "tier_name": new_pricing["tier_name"]
                }
            )
            
            logger.info(
                f"Updated Stripe subscription {subscription_id} "
                f"to {new_chairs_count} chairs"
            )
            return updated_subscription
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error updating subscription: {str(e)}")
            raise
    
    def cancel_subscription(
        self, 
        subscription_id: str, 
        immediately: bool = False
    ) -> Dict[str, Any]:
        """
        Cancel a Stripe subscription.
        
        Args:
            subscription_id: Stripe subscription ID
            immediately: Cancel immediately vs end of period
            
        Returns:
            Cancelled subscription object
        """
        try:
            if immediately:
                # Cancel immediately
                subscription = stripe.Subscription.delete(subscription_id)
            else:
                # Cancel at period end
                subscription = stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True
                )
            
            logger.info(
                f"Cancelled Stripe subscription {subscription_id} "
                f"{'immediately' if immediately else 'at period end'}"
            )
            return subscription
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error cancelling subscription: {str(e)}")
            raise
    
    def create_setup_intent(self, customer_id: str) -> Dict[str, Any]:
        """
        Create a SetupIntent for collecting payment method without charging.
        
        Args:
            customer_id: Stripe customer ID
            
        Returns:
            SetupIntent object with client_secret
        """
        try:
            setup_intent = stripe.SetupIntent.create(
                customer=customer_id,
                payment_method_types=["card"],
                usage="off_session",  # Allow charging when customer not present
                metadata={
                    "purpose": "subscription_payment_method"
                }
            )
            
            logger.info(f"Created SetupIntent {setup_intent.id} for customer {customer_id}")
            return setup_intent
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating setup intent: {str(e)}")
            raise
    
    def attach_payment_method(
        self, 
        customer_id: str, 
        payment_method_id: str,
        set_as_default: bool = True
    ) -> Dict[str, Any]:
        """
        Attach a payment method to customer and optionally set as default.
        
        Args:
            customer_id: Stripe customer ID
            payment_method_id: Payment method ID from frontend
            set_as_default: Set as default payment method
            
        Returns:
            Updated customer object
        """
        try:
            # Attach payment method to customer
            stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer_id
            )
            
            # Set as default if requested
            if set_as_default:
                customer = stripe.Customer.modify(
                    customer_id,
                    invoice_settings={
                        "default_payment_method": payment_method_id
                    }
                )
            else:
                customer = stripe.Customer.retrieve(customer_id)
            
            logger.info(
                f"Attached payment method {payment_method_id} to customer {customer_id}"
            )
            return customer
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error attaching payment method: {str(e)}")
            raise
    
    def sync_subscription_to_db(
        self, 
        subscription: Dict[str, Any], 
        organization: Organization
    ) -> None:
        """
        Sync Stripe subscription data to local database.
        
        Args:
            subscription: Stripe subscription object
            organization: Organization to update
        """
        try:
            # Update organization with subscription details
            organization.stripe_subscription_id = subscription["id"]
            organization.subscription_status = subscription["status"]
            
            # Handle dates
            if subscription.get("current_period_start"):
                organization.subscription_started_at = datetime.fromtimestamp(
                    subscription["current_period_start"]
                )
            
            if subscription.get("current_period_end"):
                organization.subscription_expires_at = datetime.fromtimestamp(
                    subscription["current_period_end"]
                )
            
            # Update chair count from subscription metadata
            if subscription.get("metadata", {}).get("chairs_count"):
                organization.chairs_count = int(subscription["metadata"]["chairs_count"])
            
            self.db.commit()
            logger.info(f"Synced subscription {subscription['id']} to organization {organization.id}")
            
        except Exception as e:
            logger.error(f"Error syncing subscription to DB: {str(e)}")
            self.db.rollback()
            raise
    
    def handle_subscription_webhook(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process Stripe webhook events for subscriptions.
        
        Args:
            event: Stripe webhook event
            
        Returns:
            Processing result
        """
        try:
            event_type = event["type"]
            subscription = event["data"]["object"]
            
            # Get organization by customer ID
            customer_id = subscription.get("customer")
            organization = self.db.query(Organization).filter(
                Organization.stripe_customer_id == customer_id
            ).first()
            
            if not organization:
                logger.warning(f"No organization found for customer {customer_id}")
                return {"status": "ignored", "reason": "organization_not_found"}
            
            # Handle different event types
            if event_type == "customer.subscription.created":
                self.sync_subscription_to_db(subscription, organization)
                return {"status": "processed", "action": "subscription_created"}
                
            elif event_type == "customer.subscription.updated":
                self.sync_subscription_to_db(subscription, organization)
                return {"status": "processed", "action": "subscription_updated"}
                
            elif event_type == "customer.subscription.deleted":
                organization.subscription_status = "cancelled"
                organization.subscription_expires_at = datetime.now(timezone.utc)
                self.db.commit()
                return {"status": "processed", "action": "subscription_cancelled"}
                
            elif event_type == "invoice.payment_succeeded":
                # Payment successful, ensure subscription is active
                organization.subscription_status = "active"
                self.db.commit()
                return {"status": "processed", "action": "payment_succeeded"}
                
            elif event_type == "invoice.payment_failed":
                # Payment failed, mark subscription accordingly
                organization.subscription_status = "past_due"
                self.db.commit()
                return {"status": "processed", "action": "payment_failed"}
                
            else:
                return {"status": "ignored", "reason": "unhandled_event_type"}
                
        except Exception as e:
            logger.error(f"Error handling webhook: {str(e)}")
            raise