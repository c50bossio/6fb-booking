"""
Billing router for chair-based subscription management.

This module handles subscription pricing, plan management, and billing operations
based on the number of chairs in a barbershop or organization.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field, validator

from db import get_db
from models import User, Organization, UserOrganization
from models import UnifiedUserRole  # Import from parent models.py
from models.organization import OrganizationType
from dependencies import get_current_user
from utils.role_permissions import (
    Permission,
    PermissionChecker
)
import logging
from utils.pricing import calculate_progressive_price
from services.stripe_service import StripeSubscriptionService
from services.notification_service import NotificationService
import stripe
from fastapi import Request, Response
from utils.error_handling import ValidationError

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/billing",
    tags=["billing"]
)

# Pydantic Schemas
class BillingPlanTier(BaseModel):
    """Represents a pricing tier based on chair count"""
    min_chairs: int
    max_chairs: Optional[int]
    price_per_chair: float
    name: str
    description: str
    features: List[str]

class BillingPlan(BaseModel):
    """Available billing plan"""
    id: str
    name: str
    description: str
    base_price: float
    tiers: List[BillingPlanTier]
    features: Dict[str, bool]
    recommended_for: str

class CurrentSubscription(BaseModel):
    """User's current subscription details"""
    organization_id: int
    organization_name: str
    plan_id: str
    plan_name: str
    chairs_count: int
    price_per_chair: float
    monthly_total: float
    status: str  # trial, active, expired, cancelled
    started_at: Optional[datetime]
    expires_at: Optional[datetime]
    trial_days_remaining: Optional[int]
    stripe_subscription_id: Optional[str]
    features: Dict[str, bool]

class PriceCalculationRequest(BaseModel):
    """Request to calculate price based on chairs"""
    chairs_count: int = Field(..., ge=1, le=100, description="Number of chairs (1-100)")
    annual_billing: bool = Field(False, description="Apply annual discount (20% off)")
    
    @validator('chairs_count')
    def validate_chairs(cls, v):
        if v < 1 or v > 100:
            raise ValueError("Chairs count must be between 1 and 100")
        return v

class PricingBreakdown(BaseModel):
    """Breakdown of pricing by bracket"""
    bracket: str
    chairs: int
    price_per_chair: float
    subtotal: float

class PriceCalculationResponse(BaseModel):
    """Response with calculated pricing"""
    chairs_count: int
    monthly_total: float
    annual_total: Optional[float]
    savings: Optional[float]
    average_per_chair: float
    tier_name: str
    breakdown: List[PricingBreakdown]

class CreateSubscriptionRequest(BaseModel):
    """Request to create a new subscription"""
    organization_id: int
    chairs_count: int = Field(..., ge=1, le=100)
    annual_billing: bool = False
    payment_method_id: Optional[str] = Field(None, description="Stripe payment method ID")

class CreateSubscriptionResponse(BaseModel):
    """Response after creating subscription"""
    subscription_id: str
    organization_id: int
    status: str
    chairs_count: int
    monthly_total: float
    next_billing_date: datetime
    stripe_subscription_id: Optional[str]
    message: str

class UpdateSubscriptionRequest(BaseModel):
    """Request to update subscription (change chairs)"""
    chairs_count: int = Field(..., ge=1, le=100)
    effective_immediately: bool = Field(True, description="Apply change now or at next billing cycle")

class UpdateSubscriptionResponse(BaseModel):
    """Response after updating subscription"""
    subscription_id: str
    old_chairs_count: int
    new_chairs_count: int
    old_monthly_total: float
    new_monthly_total: float
    effective_date: datetime
    prorated_amount: Optional[float]
    message: str

class CancelSubscriptionRequest(BaseModel):
    """Request to cancel subscription"""
    reason: Optional[str] = Field(None, description="Cancellation reason")
    cancel_immediately: bool = Field(False, description="Cancel now or at end of billing period")

class CancelSubscriptionResponse(BaseModel):
    """Response after cancelling subscription"""
    organization_id: int
    cancelled_at: datetime
    effective_date: datetime
    refund_amount: Optional[float]
    message: str

class SetupIntentRequest(BaseModel):
    """Request to create a setup intent for payment method collection"""
    organization_id: int

class SetupIntentResponse(BaseModel):
    """Response with setup intent details"""
    client_secret: str
    setup_intent_id: str
    customer_id: str

class AttachPaymentMethodRequest(BaseModel):
    """Request to attach payment method to customer"""
    organization_id: int
    payment_method_id: str
    set_as_default: bool = True

class AttachPaymentMethodResponse(BaseModel):
    """Response after attaching payment method"""
    success: bool
    customer_id: str
    payment_method_id: str
    message: str

# Progressive Pricing Configuration
# Each chair is priced based on its bracket (marginal pricing)
PRICING_BRACKETS = [
    {"start": 1, "end": 1, "price": 19.00, "name": "First Chair"},
    {"start": 2, "end": 3, "price": 17.00, "name": "Chairs 2-3"},
    {"start": 4, "end": 5, "price": 15.00, "name": "Chairs 4-5"},
    {"start": 6, "end": 9, "price": 13.00, "name": "Chairs 6-9"},
    {"start": 10, "end": 14, "price": 11.00, "name": "Chairs 10-14"},
    {"start": 15, "end": None, "price": 9.00, "name": "Chairs 15+"}
]

# Feature tiers based on total chairs
FEATURE_TIERS = [
    {
        "min_chairs": 1,
        "max_chairs": 1,
        "name": "Solo Barber",
        "description": "Perfect for individual barbers",
        "features": ["Online booking", "Payment processing", "Basic analytics", "SMS reminders"]
    },
    {
        "min_chairs": 2,
        "max_chairs": 5,
        "name": "Small Studio",
        "description": "Great for small barbershops",
        "features": ["Everything in Solo", "Staff management", "Advanced analytics", "Email marketing"]
    },
    {
        "min_chairs": 6,
        "max_chairs": 14,
        "name": "Growing Business",
        "description": "Built for busy shops",
        "features": ["Everything in Small Studio", "Inventory management", "Custom branding", "Priority support", "Multi-location support"]
    },
    {
        "min_chairs": 15,
        "max_chairs": None,
        "name": "Enterprise",
        "description": "Enterprise-grade solution",
        "features": ["Everything included", "API access", "Custom integrations", "Dedicated support", "24/7 phone support"]
    }
]

def get_user_organization(user: User, db: Session) -> Optional[Organization]:
    """Get user's primary organization"""
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == user.id,
        UserOrganization.is_primary == True
    ).first()
    
    if user_org:
        return user_org.organization
    
    # For individual barbers without organization
    if user.unified_role == UnifiedUserRole.INDIVIDUAL_BARBER.value:
        return None
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="No organization found for user"
    )

@router.get("/plans", response_model=List[BillingPlan])
async def get_billing_plans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get available billing plans with progressive chair-based pricing"""
    # Create a single plan that shows progressive pricing
    progressive_plan = BillingPlan(
        id="progressive_pricing",
        name="Progressive Volume Pricing",
        description="Pay less per chair as you grow - fair pricing that scales with your business",
        base_price=19.00,  # Starting price
        tiers=[
            BillingPlanTier(
                min_chairs=bracket["start"],
                max_chairs=bracket["end"],
                price_per_chair=bracket["price"],
                name=bracket["name"],
                description=f"${bracket['price']} per chair",
                features=[
                    "All features included",
                    "No location fees", 
                    "Unlimited bookings",
                    "24/7 support"
                ]
            )
            for bracket in PRICING_BRACKETS
        ],
        features={
            "appointments": True,
            "payments": True,
            "analytics": True,
            "email_marketing": True,
            "staff_management": True,
            "inventory": True,
            "multi_location": True,
            "api_access": True,
            "white_label": True,
            "custom_development": True
        },
        recommended_for="All business sizes - from solo barbers to multi-location enterprises"
    )
    
    # Also show feature tiers for clarity
    feature_plans = []
    for i, tier in enumerate(FEATURE_TIERS):
        # Calculate example pricing for this tier
        example_chairs = tier["min_chairs"]
        example_pricing = calculate_progressive_price(example_chairs)
        
        plan = BillingPlan(
            id=f"feature_tier_{i+1}",
            name=tier["name"],
            description=tier["description"],
            base_price=example_pricing["average_per_chair"],
            tiers=[],  # Empty as we use progressive pricing
            features={
                "appointments": True,
                "payments": True,
                "analytics": True,
                "email_marketing": True,
                "staff_management": True,
                "inventory": tier["min_chairs"] >= 6,
                "multi_location": tier["min_chairs"] >= 6,
                "api_access": tier["min_chairs"] >= 15,
                "white_label": tier["min_chairs"] >= 15,
                "custom_development": tier["min_chairs"] >= 15
            },
            recommended_for=f"{tier['min_chairs']}{'-' + str(tier['max_chairs']) if tier['max_chairs'] else '+'} chairs"
        )
        feature_plans.append(plan)
    
    # Return progressive plan first, then feature tiers
    return [progressive_plan] + feature_plans

@router.get("/current-subscription", response_model=Optional[CurrentSubscription])
async def get_current_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's current subscription details"""
    org = get_user_organization(current_user, db)
    
    if not org:
        # Individual barber without organization
        return CurrentSubscription(
            organization_id=0,
            organization_name="Individual Practice",
            plan_id="plan_1",
            plan_name="Solo Barber",
            chairs_count=1,
            price_per_chair=19.00,
            monthly_total=19.00,
            status=current_user.subscription_status or "trial",
            started_at=current_user.trial_started_at,
            expires_at=current_user.trial_expires_at,
            trial_days_remaining=None,
            stripe_subscription_id=None,
            features={
                "appointments": True,
                "payments": True,
                "basic_analytics": True,
                "sms_notifications": True
            }
        )
    
    # Calculate trial days remaining if in trial
    trial_days_remaining = None
    if org.subscription_status == "trial" and org.subscription_expires_at:
        days_left = (org.subscription_expires_at - datetime.now(timezone.utc).replace(tzinfo=None)).days
        trial_days_remaining = max(0, days_left)
    
    # Get progressive pricing info including multi-location
    total_chairs = org.total_chairs_count if hasattr(org, 'total_chairs_count') else org.chairs_count
    pricing_result = calculate_progressive_price(total_chairs)
    
    return CurrentSubscription(
        organization_id=org.id,
        organization_name=org.name,
        plan_id="progressive_pricing",
        plan_name=pricing_result["tier_name"],
        chairs_count=total_chairs,
        price_per_chair=pricing_result["average_per_chair"],
        monthly_total=pricing_result["total_price"],
        status=org.subscription_status,
        started_at=org.subscription_started_at,
        expires_at=org.subscription_expires_at,
        trial_days_remaining=trial_days_remaining,
        stripe_subscription_id=org.stripe_subscription_id,
        features=org.features_enabled or {}
    )

@router.post("/calculate-price", response_model=PriceCalculationResponse)
async def calculate_price(
    request: PriceCalculationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculate price based on number of chairs using progressive pricing"""
    # Get progressive pricing calculation
    pricing_result = calculate_progressive_price(request.chairs_count)
    
    # Handle multi-location - sum all chairs across locations if user is enterprise owner
    total_chairs = request.chairs_count
    if current_user.unified_role == UnifiedUserRole.ENTERPRISE_OWNER.value:
        # Get all organizations for this user
        user_orgs = db.query(UserOrganization).filter(
            UserOrganization.user_id == current_user.id
        ).all()
        
        # Sum chairs across all organizations
        total_chairs = 0
        for user_org in user_orgs:
            if user_org.organization and user_org.organization.is_active:
                total_chairs += user_org.organization.chairs_count or 0
                # Also count child organizations
                if hasattr(user_org.organization, 'child_organizations'):
                    for child in user_org.organization.child_organizations:
                        if child.is_active:
                            total_chairs += child.chairs_count or 0
        
        # Recalculate if we have multiple locations
        if total_chairs > request.chairs_count:
            pricing_result = calculate_progressive_price(total_chairs)
    
    response = PriceCalculationResponse(
        chairs_count=total_chairs,
        monthly_total=pricing_result["total_price"],
        annual_total=None,
        savings=None,
        average_per_chair=pricing_result["average_per_chair"],
        tier_name=pricing_result["tier_name"],
        breakdown=[PricingBreakdown(**b) for b in pricing_result["breakdown"]]
    )
    
    if request.annual_billing:
        # 20% discount for annual billing
        annual_total = pricing_result["total_price"] * 12 * 0.8
        savings = (pricing_result["total_price"] * 12) - annual_total
        response.annual_total = round(annual_total, 2)
        response.savings = round(savings, 2)
    
    return response

@router.post("/setup-intent", response_model=SetupIntentResponse)
async def create_setup_intent(
    request: SetupIntentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a Stripe SetupIntent for collecting payment method"""
    # Verify organization and permissions
    org = db.query(Organization).filter(Organization.id == request.organization_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Check user's role in organization
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == current_user.id,
        UserOrganization.organization_id == org.id
    ).first()
    
    # Check permissions using new system
    checker = PermissionChecker(current_user, db, org.id)
    if not checker.has_permission(Permission.MANAGE_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have billing permissions for this organization"
        )
    
    # Initialize Stripe service
    stripe_service = StripeSubscriptionService(db)
    
    # Create or retrieve Stripe customer
    customer = stripe_service.create_stripe_customer(current_user, org)
    
    # Create setup intent
    setup_intent = stripe_service.create_setup_intent(customer.id)
    
    return SetupIntentResponse(
        client_secret=setup_intent.client_secret,
        setup_intent_id=setup_intent.id,
        customer_id=customer.id
    )

@router.post("/attach-payment-method", response_model=AttachPaymentMethodResponse)
async def attach_payment_method(
    request: AttachPaymentMethodRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Attach a payment method to the organization's Stripe customer"""
    # Verify organization and permissions
    org = db.query(Organization).filter(Organization.id == request.organization_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Check user's role in organization
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == current_user.id,
        UserOrganization.organization_id == org.id
    ).first()
    
    # Check permissions using new system
    checker = PermissionChecker(current_user, db, org.id)
    if not checker.has_permission(Permission.MANAGE_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have billing permissions for this organization"
        )
    
    if not org.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Stripe customer found for this organization"
        )
    
    # Initialize Stripe service
    stripe_service = StripeSubscriptionService(db)
    
    try:
        # Attach payment method
        customer = stripe_service.attach_payment_method(
            org.stripe_customer_id,
            request.payment_method_id,
            request.set_as_default
        )
        
        return AttachPaymentMethodResponse(
            success=True,
            customer_id=customer.id,
            payment_method_id=request.payment_method_id,
            message="Payment method attached successfully"
        )
    except Exception as e:
        logger.error(f"Failed to attach payment method: {str(e)}")
        raise ValidationError("Request validation failed")

@router.post("/create-subscription", response_model=CreateSubscriptionResponse)
async def create_subscription(
    request: CreateSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new Stripe subscription with progressive chair-based pricing"""
    # Verify user has permission for this organization
    org = db.query(Organization).filter(Organization.id == request.organization_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Check user's role in organization
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == current_user.id,
        UserOrganization.organization_id == org.id
    ).first()
    
    # Check permissions using new system
    checker = PermissionChecker(current_user, db, org.id)
    if not checker.has_permission(Permission.MANAGE_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have billing permissions for this organization"
        )
    
    # Calculate progressive pricing (including any child organizations)
    total_chairs = request.chairs_count
    # If this is a headquarters, include all child locations
    if org.organization_type == OrganizationType.HEADQUARTERS.value:
        total_chairs = org.total_chairs_count if hasattr(org, 'total_chairs_count') else request.chairs_count
    
    pricing_result = calculate_progressive_price(total_chairs)
    monthly_total = pricing_result["total_price"]
    tier_name = pricing_result["tier_name"]
    
    # Initialize Stripe service
    stripe_service = StripeSubscriptionService(db)
    
    try:
        # Create or retrieve Stripe customer
        if not org.stripe_customer_id:
            customer = stripe_service.create_stripe_customer(current_user, org)
        else:
            customer = {"id": org.stripe_customer_id}
        
        # Create Stripe subscription
        subscription = stripe_service.create_subscription(
            customer_id=customer["id"],
            chairs_count=total_chairs,
            trial_days=14,
            payment_method_id=request.payment_method_id
        )
        
        # Update organization with subscription info
        org.chairs_count = request.chairs_count
        org.subscription_status = subscription["status"]
        org.stripe_subscription_id = subscription["id"]
        
        # Sync subscription data
        stripe_service.sync_subscription_to_db(subscription, org)
        
        # Calculate next billing date
        next_billing_date = datetime.fromtimestamp(subscription["current_period_end"])
        
        return CreateSubscriptionResponse(
            subscription_id=subscription["id"],
            organization_id=org.id,
            status=subscription["status"],
            chairs_count=total_chairs,
            monthly_total=monthly_total,
            next_billing_date=next_billing_date,
            stripe_subscription_id=subscription["id"],
            message=f"Successfully created {tier_name} subscription for {total_chairs} chairs"
        )
        
    except Exception as e:
        logger.error(f"Failed to create subscription: {str(e)}")
        raise ValidationError("Request validation failed")

@router.put("/update-subscription", response_model=UpdateSubscriptionResponse)
async def update_subscription(
    request: UpdateSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update subscription by changing chair count"""
    org = get_user_organization(current_user, db)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Individual barbers cannot update subscriptions"
        )
    
    # Check permissions
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == current_user.id,
        UserOrganization.organization_id == org.id
    ).first()
    
    # Check permissions using new system
    checker = PermissionChecker(current_user, db, org.id)
    if not checker.has_permission(Permission.MANAGE_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have billing permissions for this organization"
        )
    
    if not org.stripe_subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription found"
        )
    
    # Store old values and calculate old pricing
    old_chairs = org.total_chairs_count if hasattr(org, 'total_chairs_count') else org.chairs_count
    old_pricing = calculate_progressive_price(old_chairs)
    old_monthly = old_pricing["total_price"]
    
    # Calculate new pricing
    new_total_chairs = request.chairs_count
    # If headquarters, this affects all locations
    if org.organization_type == OrganizationType.HEADQUARTERS.value:
        # Adjust total based on change
        chair_difference = request.chairs_count - org.chairs_count
        new_total_chairs = old_chairs + chair_difference
    
    new_pricing = calculate_progressive_price(new_total_chairs)
    new_monthly = new_pricing["total_price"]
    new_tier = new_pricing["tier_name"]
    
    # Initialize Stripe service
    stripe_service = StripeSubscriptionService(db)
    
    try:
        # Update Stripe subscription
        updated_subscription = stripe_service.update_subscription(
            org.stripe_subscription_id,
            new_total_chairs,
            prorate=request.effective_immediately
        )
        
        # Update organization
        org.chairs_count = request.chairs_count
        
        # Sync subscription data
        stripe_service.sync_subscription_to_db(updated_subscription, org)
        
        # Calculate proration (Stripe handles this automatically)
        prorated_amount = None
        if request.effective_immediately:
            # In a real implementation, we would fetch the upcoming invoice
            # to get the exact proration amount
            pass
        
        effective_date = datetime.now(timezone.utc) if request.effective_immediately else org.subscription_expires_at
        
        return UpdateSubscriptionResponse(
            subscription_id=org.stripe_subscription_id,
            old_chairs_count=old_chairs,
            new_chairs_count=new_total_chairs,
            old_monthly_total=old_monthly,
            new_monthly_total=new_monthly,
            effective_date=effective_date,
            prorated_amount=prorated_amount,
            message=f"Successfully updated to {new_tier} plan with {new_total_chairs} chairs"
        )
        
    except Exception as e:
        logger.error(f"Failed to update subscription: {str(e)}")
        raise ValidationError("Request validation failed")

@router.post("/cancel-subscription", response_model=CancelSubscriptionResponse)
async def cancel_subscription(
    request: CancelSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel subscription"""
    org = get_user_organization(current_user, db)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Individual barbers cannot cancel subscriptions"
        )
    
    # Check permissions
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == current_user.id,
        UserOrganization.organization_id == org.id
    ).first()
    
    # Check permissions using new system
    checker = PermissionChecker(current_user, db, org.id)
    if not checker.has_permission(Permission.MANAGE_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have billing permissions for this organization"
        )
    
    if not org.stripe_subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription found"
        )
    
    # Initialize Stripe service
    stripe_service = StripeSubscriptionService(db)
    
    try:
        # Cancel Stripe subscription
        cancelled_subscription = stripe_service.cancel_subscription(
            org.stripe_subscription_id,
            immediately=request.cancel_immediately
        )
        
        # Update organization status
        if request.cancel_immediately:
            org.subscription_status = "cancelled"
        else:
            org.subscription_status = "cancelling"  # Will cancel at period end
        
        cancelled_at = datetime.now(timezone.utc)
        
        # Determine effective date
        if request.cancel_immediately:
            effective_date = cancelled_at
        else:
            # Get from Stripe subscription
            effective_date = datetime.fromtimestamp(cancelled_subscription["current_period_end"])
            org.subscription_expires_at = effective_date
        
        # Refund calculation (Stripe handles this automatically for immediate cancellation)
        refund_amount = None
        # In production, you would check the Stripe invoice for refund amount
        
        db.commit()
        
        logger.info(f"Cancelled subscription for org {org.id} effective {effective_date}")
        
        return CancelSubscriptionResponse(
            organization_id=org.id,
            cancelled_at=cancelled_at,
            effective_date=effective_date,
            refund_amount=refund_amount,
            message=f"Subscription cancelled {' immediately' if request.cancel_immediately else ' at end of billing period'}"
        )
        
    except Exception as e:
        logger.error(f"Failed to cancel subscription: {str(e)}")
        raise ValidationError("Request validation failed")

class PaymentFailureNotification(BaseModel):
    """Notification for payment failures"""
    organization_id: int
    failure_type: str  # card_declined, insufficient_funds, etc.
    failure_message: str
    payment_method_last4: str
    next_retry_at: Optional[datetime]
    retry_count: int
    requires_action: bool

@router.post("/webhook/stripe")
async def handle_stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle Stripe webhook events including payment failures"""
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET
    
    if not endpoint_secret:
        logger.warning("Stripe webhook secret not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook configuration error"
        )
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError:
        # Invalid payload
        logger.error("Invalid webhook payload")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        # Invalid signature
        logger.error("Invalid webhook signature")
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Initialize Stripe service
    stripe_service = StripeSubscriptionService(db)
    
    # Handle the event
    if event["type"] == "payment_intent.payment_failed":
        payment_intent = event["data"]["object"]
        
        # Get organization from customer ID
        customer_id = payment_intent.get("customer")
        if customer_id:
            org = db.query(Organization).filter(
                Organization.stripe_customer_id == customer_id
            ).first()
            
            if org:
                # Log payment failure
                logger.error(f"Payment failed for organization {org.id}: {payment_intent.get('last_payment_error', {}).get('message')}")
                
                # Update organization payment status
                org.payment_status = "failed"
                org.last_payment_failure = datetime.now(timezone.utc)
                
                # Get failure details
                error = payment_intent.get('last_payment_error', {})
                failure_code = error.get('code', 'unknown')
                failure_message = error.get('message', 'Payment failed')
                
                # Store failure details
                failure_details = {
                    "code": failure_code,
                    "message": failure_message,
                    "payment_method": error.get('payment_method', {}).get('id'),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "retry_count": payment_intent.get('attempt_count', 1)
                }
                
                if not org.payment_failure_history:
                    org.payment_failure_history = []
                org.payment_failure_history.append(failure_details)
                
                db.commit()
                
                # Send notification email to organization owner
                try:
                    notification_service = NotificationService()
                    
                    # Get organization owner email
                    owner = db.query(User).join(UserOrganization).filter(
                        UserOrganization.organization_id == org.id,
                        UserOrganization.role.in_(["owner", "admin"])
                    ).first()
                    
                    if owner and owner.email:
                        subject = f"Payment Failure Alert - {org.name}"
                        body = f"""
                        Dear {owner.name or 'Organization Owner'},
                        
                        We encountered an issue processing payment for your BookedBarber subscription.
                        
                        Organization: {org.name}
                        Failure Details: {failure_details.get('reason', 'Payment processing error')}
                        Amount: ${failure_details.get('amount', 0):.2f}
                        Date: {failure_details.get('timestamp', datetime.now().isoformat())}
                        
                        Please update your payment method in the billing section of your dashboard to avoid service interruption.
                        
                        If you need assistance, please contact our support team.
                        
                        Best regards,
                        The BookedBarber Team
                        """
                        
                        notification_service.send_email(
                            to_email=owner.email,
                            subject=subject,
                            body=body
                        )
                        logger.info(f"Payment failure notification sent to {owner.email} for organization {org.id}")
                except Exception as e:
                    logger.error(f"Failed to send payment failure notification: {str(e)}")
    
    elif event["type"] == "invoice.payment_failed":
        invoice = event["data"]["object"]
        
        # Handle subscription payment failures
        customer_id = invoice.get("customer")
        if customer_id:
            org = db.query(Organization).filter(
                Organization.stripe_customer_id == customer_id
            ).first()
            
            if org:
                # Check if this is a final failure (no more retries)
                if invoice.get("next_payment_attempt") is None:
                    logger.error(f"Final payment failure for organization {org.id}")
                    org.subscription_status = "past_due"
                    org.payment_status = "failed"
                else:
                    # More retries scheduled
                    next_attempt = datetime.fromtimestamp(invoice.get("next_payment_attempt"))
                    logger.warning(f"Payment retry scheduled for organization {org.id} at {next_attempt}")
                    org.subscription_status = "past_due"
                    org.next_payment_retry = next_attempt
                
                db.commit()
    
    elif event["type"] == "customer.subscription.updated":
        subscription = event["data"]["object"]
        
        # Sync subscription status
        customer_id = subscription.get("customer")
        if customer_id:
            org = db.query(Organization).filter(
                Organization.stripe_customer_id == customer_id
            ).first()
            
            if org:
                stripe_service.sync_subscription_to_db(subscription, org)
    
    elif event["type"] == "setup_intent.succeeded":
        setup_intent = event["data"]["object"]
        
        # Payment method successfully added
        customer_id = setup_intent.get("customer")
        if customer_id:
            org = db.query(Organization).filter(
                Organization.stripe_customer_id == customer_id
            ).first()
            
            if org:
                # Clear any payment failure status
                org.payment_status = "active"
                org.last_payment_failure = None
                org.payment_failure_history = []
                db.commit()
                
                logger.info(f"Payment method successfully added for organization {org.id}")
    
    return Response(status_code=200)

@router.get("/payment-status/{organization_id}", response_model=dict)
async def get_payment_status(
    organization_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed payment status and failure information"""
    # Verify organization and permissions
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Check permissions
    checker = PermissionChecker(current_user, db, org.id)
    if not checker.has_permission(Permission.VIEW_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view billing information"
        )
    
    payment_status = {
        "status": org.payment_status or "unknown",
        "subscription_status": org.subscription_status,
        "has_payment_method": bool(org.stripe_customer_id),
        "last_failure": None,
        "next_retry": None,
        "failure_history": []
    }
    
    if org.last_payment_failure:
        payment_status["last_failure"] = {
            "date": org.last_payment_failure,
            "message": "Payment method failed"
        }
    
    if org.next_payment_retry:
        payment_status["next_retry"] = org.next_payment_retry
    
    if org.payment_failure_history:
        # Get last 5 failures
        payment_status["failure_history"] = org.payment_failure_history[-5:]
    
    return payment_status