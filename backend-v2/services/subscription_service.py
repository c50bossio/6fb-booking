"""
Subscription service for chair-based billing.

This service handles subscription creation, updates, trial management,
and pricing calculation based on the number of chairs in an organization.
"""

from typing import Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
import logging
import stripe

from models.organization import Organization, BillingPlan
from config import settings

logger = logging.getLogger(__name__)


class SubscriptionService:
    """
    Service for managing organization subscriptions with chair-based billing.
    
    Pricing Model:
    - 1-3 chairs: $39/month per chair
    - 4-6 chairs: $35/month per chair  
    - 7-10 chairs: $29/month per chair
    - 11+ chairs: $25/month per chair
    
    Features:
    - 14-day free trial for new organizations
    - Organization-level billing (not individual)
    - Automatic plan upgrades based on chair count
    - Integration with Stripe (mock implementation for now)
    """
    
    # Pricing tiers (chair count: price per chair)
    PRICING_TIERS = [
        (3, 39.00),    # 1-3 chairs: $39/chair
        (6, 35.00),    # 4-6 chairs: $35/chair
        (10, 29.00),   # 7-10 chairs: $29/chair
        (float('inf'), 25.00)  # 11+ chairs: $25/chair
    ]
    
    # Trial period in days
    TRIAL_PERIOD_DAYS = 14
    
    def __init__(self):
        """Initialize the subscription service."""
        # Initialize Stripe if API key is available
        if hasattr(settings, 'STRIPE_SECRET_KEY') and settings.STRIPE_SECRET_KEY:
            stripe.api_key = settings.STRIPE_SECRET_KEY
        else:
            logger.warning("Stripe API key not configured - using mock mode")
    
    def calculate_chair_price(self, chairs: int) -> float:
        """
        Calculate the monthly price based on number of chairs.
        
        Args:
            chairs: Number of chairs in the organization
            
        Returns:
            float: Monthly price for all chairs
        """
        if chairs <= 0:
            return 0.0
        
        total_price = 0.0
        remaining_chairs = chairs
        
        # Calculate price based on tiers
        for tier_limit, tier_price in self.PRICING_TIERS:
            if remaining_chairs <= 0:
                break
                
            # Chairs in this tier
            chairs_in_tier = min(remaining_chairs, tier_limit - (chairs - remaining_chairs))
            total_price += chairs_in_tier * tier_price
            remaining_chairs -= chairs_in_tier
        
        return total_price
    
    def get_billing_plan(self, chairs: int) -> str:
        """
        Determine billing plan based on chair count.
        
        Args:
            chairs: Number of chairs
            
        Returns:
            str: Billing plan name
        """
        if chairs == 1:
            return BillingPlan.INDIVIDUAL.value
        elif chairs <= 5:
            return BillingPlan.STUDIO.value
        elif chairs <= 10:
            return BillingPlan.SALON.value
        else:
            return BillingPlan.ENTERPRISE.value
    
    async def create_subscription(
        self,
        db: Session,
        organization_id: int,
        chairs: int,
        billing_email: str,
        payment_method_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new subscription for an organization.
        
        Args:
            db: Database session
            organization_id: Organization ID
            chairs: Number of chairs to bill for
            billing_email: Email for billing notifications
            payment_method_id: Stripe payment method ID (optional for trial)
            
        Returns:
            Dict containing subscription details
        """
        # Get organization
        organization = db.query(Organization).filter_by(id=organization_id).first()
        if not organization:
            raise ValueError(f"Organization {organization_id} not found")
        
        # Calculate pricing
        monthly_price = self.calculate_chair_price(chairs)
        billing_plan = self.get_billing_plan(chairs)
        
        # Set trial dates
        trial_start = datetime.now(timezone.utc).replace(tzinfo=None)
        trial_end = trial_start + timedelta(days=self.TRIAL_PERIOD_DAYS)
        
        # Create Stripe subscription (mock for now)
        subscription_data = await self._create_stripe_subscription(
            organization,
            chairs,
            monthly_price,
            billing_email,
            payment_method_id
        )
        
        # Update organization
        organization.chairs_count = chairs
        organization.billing_plan = billing_plan
        organization.subscription_status = 'trial'
        organization.subscription_started_at = trial_start
        organization.subscription_expires_at = trial_end
        organization.billing_contact_email = billing_email
        organization.stripe_subscription_id = subscription_data.get('id', f'mock_sub_{organization_id}')
        
        # Calculate monthly revenue limit based on plan
        revenue_limits = {
            BillingPlan.INDIVIDUAL.value: 10000.00,
            BillingPlan.STUDIO.value: 25000.00,
            BillingPlan.SALON.value: 50000.00,
            BillingPlan.ENTERPRISE.value: None  # Unlimited
        }
        organization.monthly_revenue_limit = revenue_limits.get(billing_plan)
        
        db.commit()
        
        return {
            'organization_id': organization_id,
            'subscription_id': organization.stripe_subscription_id,
            'status': 'trial',
            'chairs': chairs,
            'monthly_price': monthly_price,
            'billing_plan': billing_plan,
            'trial_start': trial_start.isoformat(),
            'trial_end': trial_end.isoformat(),
            'billing_email': billing_email
        }
    
    async def update_subscription(
        self,
        db: Session,
        organization_id: int,
        new_chairs: int
    ) -> Dict[str, Any]:
        """
        Update an existing subscription with new chair count.
        
        Args:
            db: Database session
            organization_id: Organization ID
            new_chairs: New number of chairs
            
        Returns:
            Dict containing updated subscription details
        """
        # Get organization
        organization = db.query(Organization).filter_by(id=organization_id).first()
        if not organization:
            raise ValueError(f"Organization {organization_id} not found")
        
        if not organization.stripe_subscription_id:
            raise ValueError(f"Organization {organization_id} has no active subscription")
        
        # Calculate new pricing
        old_chairs = organization.chairs_count
        new_monthly_price = self.calculate_chair_price(new_chairs)
        new_billing_plan = self.get_billing_plan(new_chairs)
        
        # Update Stripe subscription (mock for now)
        await self._update_stripe_subscription(
            organization.stripe_subscription_id,
            new_chairs,
            new_monthly_price
        )
        
        # Update organization
        organization.chairs_count = new_chairs
        organization.billing_plan = new_billing_plan
        
        # Update revenue limit if plan changed
        if new_billing_plan != organization.billing_plan:
            revenue_limits = {
                BillingPlan.INDIVIDUAL.value: 10000.00,
                BillingPlan.STUDIO.value: 25000.00,
                BillingPlan.SALON.value: 50000.00,
                BillingPlan.ENTERPRISE.value: None
            }
            organization.monthly_revenue_limit = revenue_limits.get(new_billing_plan)
        
        db.commit()
        
        return {
            'organization_id': organization_id,
            'subscription_id': organization.stripe_subscription_id,
            'old_chairs': old_chairs,
            'new_chairs': new_chairs,
            'old_monthly_price': self.calculate_chair_price(old_chairs),
            'new_monthly_price': new_monthly_price,
            'billing_plan': new_billing_plan,
            'status': organization.subscription_status
        }
    
    async def cancel_subscription(
        self,
        db: Session,
        organization_id: int,
        immediate: bool = False
    ) -> Dict[str, Any]:
        """
        Cancel an organization's subscription.
        
        Args:
            db: Database session
            organization_id: Organization ID
            immediate: Cancel immediately vs at period end
            
        Returns:
            Dict containing cancellation details
        """
        # Get organization
        organization = db.query(Organization).filter_by(id=organization_id).first()
        if not organization:
            raise ValueError(f"Organization {organization_id} not found")
        
        if not organization.stripe_subscription_id:
            raise ValueError(f"Organization {organization_id} has no active subscription")
        
        # Cancel Stripe subscription (mock for now)
        await self._cancel_stripe_subscription(
            organization.stripe_subscription_id,
            immediate
        )
        
        # Update organization
        if immediate:
            organization.subscription_status = 'cancelled'
            organization.subscription_expires_at = datetime.now(timezone.utc).replace(tzinfo=None)
        else:
            organization.subscription_status = 'cancelling'
            # Keep existing expiry date for grace period
        
        db.commit()
        
        return {
            'organization_id': organization_id,
            'subscription_id': organization.stripe_subscription_id,
            'status': organization.subscription_status,
            'cancelled_at': datetime.now(timezone.utc).replace(tzinfo=None).isoformat(),
            'expires_at': organization.subscription_expires_at.isoformat() if organization.subscription_expires_at else None,
            'immediate': immediate
        }
    
    def check_trial_status(self, db: Session, organization_id: int) -> Dict[str, Any]:
        """
        Check the trial status of an organization.
        
        Args:
            db: Database session
            organization_id: Organization ID
            
        Returns:
            Dict containing trial status information
        """
        # Get organization
        organization = db.query(Organization).filter_by(id=organization_id).first()
        if not organization:
            raise ValueError(f"Organization {organization_id} not found")
        
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        
        # Check if in trial
        is_trial = organization.subscription_status == 'trial'
        trial_active = is_trial and organization.is_trial_active
        
        # Calculate days remaining
        days_remaining = 0
        if trial_active and organization.subscription_expires_at:
            delta = organization.subscription_expires_at - now
            days_remaining = max(0, delta.days)
        
        return {
            'organization_id': organization_id,
            'is_trial': is_trial,
            'trial_active': trial_active,
            'trial_started_at': organization.subscription_started_at.isoformat() if organization.subscription_started_at else None,
            'trial_expires_at': organization.subscription_expires_at.isoformat() if organization.subscription_expires_at else None,
            'days_remaining': days_remaining,
            'subscription_status': organization.subscription_status
        }
    
    def get_subscription_details(self, db: Session, organization_id: int) -> Dict[str, Any]:
        """
        Get detailed subscription information for an organization.
        
        Args:
            db: Database session
            organization_id: Organization ID
            
        Returns:
            Dict containing comprehensive subscription details
        """
        # Get organization
        organization = db.query(Organization).filter_by(id=organization_id).first()
        if not organization:
            raise ValueError(f"Organization {organization_id} not found")
        
        # Calculate pricing
        monthly_price = self.calculate_chair_price(organization.chairs_count)
        
        # Get trial status
        trial_info = self.check_trial_status(db, organization_id)
        
        # Get enabled features
        features = organization.enabled_features
        
        return {
            'organization_id': organization_id,
            'organization_name': organization.name,
            'subscription_id': organization.stripe_subscription_id,
            'status': organization.subscription_status,
            'billing_plan': organization.billing_plan,
            'chairs_count': organization.chairs_count,
            'monthly_price': monthly_price,
            'price_per_chair': monthly_price / organization.chairs_count if organization.chairs_count > 0 else 0,
            'billing_email': organization.billing_contact_email,
            'started_at': organization.subscription_started_at.isoformat() if organization.subscription_started_at else None,
            'expires_at': organization.subscription_expires_at.isoformat() if organization.subscription_expires_at else None,
            'trial_info': trial_info,
            'features': features,
            'monthly_revenue_limit': organization.monthly_revenue_limit,
            'is_enterprise': organization.is_enterprise,
            'total_chairs': organization.total_chairs_count  # Includes child organizations
        }
    
    async def convert_trial_to_paid(
        self,
        db: Session,
        organization_id: int,
        payment_method_id: str
    ) -> Dict[str, Any]:
        """
        Convert a trial subscription to a paid subscription.
        
        Args:
            db: Database session
            organization_id: Organization ID
            payment_method_id: Stripe payment method ID
            
        Returns:
            Dict containing conversion details
        """
        # Get organization
        organization = db.query(Organization).filter_by(id=organization_id).first()
        if not organization:
            raise ValueError(f"Organization {organization_id} not found")
        
        if organization.subscription_status != 'trial':
            raise ValueError(f"Organization {organization_id} is not in trial")
        
        # Update Stripe subscription with payment method (mock for now)
        await self._add_payment_method_to_subscription(
            organization.stripe_subscription_id,
            payment_method_id
        )
        
        # Update organization
        organization.subscription_status = 'active'
        organization.subscription_expires_at = None  # No expiry for active subscriptions
        
        db.commit()
        
        return {
            'organization_id': organization_id,
            'subscription_id': organization.stripe_subscription_id,
            'status': 'active',
            'converted_at': datetime.now(timezone.utc).replace(tzinfo=None).isoformat(),
            'monthly_price': self.calculate_chair_price(organization.chairs_count)
        }
    
    # Mock Stripe methods (to be implemented with actual Stripe integration)
    
    async def _create_stripe_subscription(
        self,
        organization: Organization,
        chairs: int,
        monthly_price: float,
        billing_email: str,
        payment_method_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Mock implementation of Stripe subscription creation."""
        logger.info(f"Mock: Creating Stripe subscription for org {organization.id}")
        return {
            'id': f'sub_mock_{organization.id}_{int(datetime.now().timestamp())}',
            'status': 'trialing',
            'trial_end': int((datetime.now() + timedelta(days=self.TRIAL_PERIOD_DAYS)).timestamp())
        }
    
    async def _update_stripe_subscription(
        self,
        subscription_id: str,
        chairs: int,
        monthly_price: float
    ) -> Dict[str, Any]:
        """Mock implementation of Stripe subscription update."""
        logger.info(f"Mock: Updating Stripe subscription {subscription_id}")
        return {
            'id': subscription_id,
            'status': 'active',
            'updated': True
        }
    
    async def _cancel_stripe_subscription(
        self,
        subscription_id: str,
        immediate: bool = False
    ) -> Dict[str, Any]:
        """Mock implementation of Stripe subscription cancellation."""
        logger.info(f"Mock: Cancelling Stripe subscription {subscription_id}")
        return {
            'id': subscription_id,
            'status': 'cancelled' if immediate else 'cancelling',
            'cancelled': True
        }
    
    async def _add_payment_method_to_subscription(
        self,
        subscription_id: str,
        payment_method_id: str
    ) -> Dict[str, Any]:
        """Mock implementation of adding payment method to subscription."""
        logger.info(f"Mock: Adding payment method to subscription {subscription_id}")
        return {
            'id': subscription_id,
            'payment_method': payment_method_id,
            'status': 'active'
        }


# Create a singleton instance
subscription_service = SubscriptionService()