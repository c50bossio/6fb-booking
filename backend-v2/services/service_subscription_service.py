"""
Service Subscription Business Logic

This service handles:
- Creating and managing subscription templates
- Client subscription lifecycle (subscribe, use services, cancel)  
- Stripe billing integration for recurring payments
- Usage tracking and service allocation
- Automatic billing period management
"""

from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta, timezone
from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
import logging
import stripe
from decimal import Decimal

from models.service_subscription import (
    ServiceSubscriptionTemplate, 
    ServiceSubscription,
    SubscriptionTemplateService,
    SubscriptionUsageRecord,
    SubscriptionBillingEvent,
    SubscriptionType,
    SubscriptionStatus,
    BillingInterval
)
from models import Service, User, Appointment
from config import settings

logger = logging.getLogger(__name__)


class ServiceSubscriptionService:
    """
    Service for managing service subscriptions and recurring billing.
    
    Key Features:
    - Template-based subscription packages
    - Automatic Stripe billing integration
    - Service usage tracking and allocation
    - Flexible billing intervals and pricing
    - VIP perks and priority booking
    """
    
    def __init__(self):
        """Initialize the service subscription service."""
        # Initialize Stripe if API key is available
        if hasattr(settings, 'STRIPE_SECRET_KEY') and settings.STRIPE_SECRET_KEY:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            self.stripe_enabled = True
        else:
            logger.warning("Stripe API key not configured - subscription billing disabled")
            self.stripe_enabled = False
    
    # Template Management
    
    async def create_subscription_template(
        self,
        db: Session,
        barber_id: int,
        template_data: Dict[str, Any]
    ) -> ServiceSubscriptionTemplate:
        """
        Create a new subscription template that barbers can offer to clients.
        
        Args:
            db: Database session
            barber_id: ID of barber creating the template
            template_data: Template configuration data
            
        Returns:
            Created ServiceSubscriptionTemplate
        """
        # Validate barber exists
        barber = db.query(User).filter_by(id=barber_id).first()
        if not barber:
            raise ValueError(f"Barber {barber_id} not found")
        
        # Create template
        template = ServiceSubscriptionTemplate(
            name=template_data['name'],
            description=template_data.get('description'),
            subscription_type=SubscriptionType(template_data['subscription_type']),
            price=template_data['price'],
            original_price=template_data.get('original_price'),
            billing_interval=BillingInterval(template_data['billing_interval']),
            services_per_period=template_data.get('services_per_period', 1),
            rollover_unused=template_data.get('rollover_unused', False),
            max_rollover=template_data.get('max_rollover'),
            duration_months=template_data.get('duration_months'),
            min_commitment_months=template_data.get('min_commitment_months', 1),
            early_cancellation_fee=template_data.get('early_cancellation_fee', 0.0),
            min_days_between_services=template_data.get('min_days_between_services', 1),
            max_advance_booking_days=template_data.get('max_advance_booking_days', 90),
            blackout_dates=template_data.get('blackout_dates'),
            priority_booking=template_data.get('priority_booking', False),
            discount_on_additional=template_data.get('discount_on_additional', 0.0),
            free_product_samples=template_data.get('free_product_samples', False),
            vip_perks=template_data.get('vip_perks'),
            max_subscribers=template_data.get('max_subscribers'),
            requires_approval=template_data.get('requires_approval', False),
            barber_id=barber_id,
            location_id=template_data.get('location_id')
        )
        
        db.add(template)
        db.flush()  # Get ID for template
        
        # Add services to template
        if 'services' in template_data:
            for service_config in template_data['services']:
                service_id = service_config['service_id']
                quantity = service_config.get('quantity_per_period', 1)
                
                # Validate service exists and belongs to barber
                service = db.query(Service).filter_by(id=service_id).first()
                if not service:
                    raise ValueError(f"Service {service_id} not found")
                
                template_service = SubscriptionTemplateService(
                    template_id=template.id,
                    service_id=service_id,
                    quantity_per_period=quantity
                )
                db.add(template_service)
        
        db.commit()
        
        logger.info(f"Created subscription template '{template.name}' for barber {barber_id}")
        return template
    
    def get_barber_templates(
        self,
        db: Session,
        barber_id: int,
        active_only: bool = True
    ) -> List[ServiceSubscriptionTemplate]:
        """Get all subscription templates for a barber"""
        query = db.query(ServiceSubscriptionTemplate).filter_by(barber_id=barber_id)
        
        if active_only:
            query = query.filter_by(is_active=True)
        
        return query.order_by(ServiceSubscriptionTemplate.created_at.desc()).all()
    
    def get_template_details(
        self,
        db: Session,
        template_id: int
    ) -> Optional[Dict[str, Any]]:
        """Get detailed information about a subscription template"""
        template = db.query(ServiceSubscriptionTemplate).filter_by(id=template_id).first()
        if not template:
            return None
        
        # Get included services
        services = []
        for template_service in template.template_services:
            service = template_service.service
            services.append({
                'service_id': service.id,
                'service_name': service.name,
                'service_price': service.base_price,
                'quantity_per_period': template_service.quantity_per_period,
                'total_value': service.base_price * template_service.quantity_per_period
            })
        
        # Calculate metrics
        total_value = template.get_total_value()
        savings = template.get_savings_amount()
        savings_percent = template.get_savings_percentage()
        
        # Get current subscriber count
        subscriber_count = db.query(ServiceSubscription).filter(
            and_(
                ServiceSubscription.template_id == template_id,
                ServiceSubscription.status == SubscriptionStatus.ACTIVE
            )
        ).count()
        
        return {
            'template': template,
            'services': services,
            'total_value': total_value,
            'savings_amount': savings,
            'savings_percentage': savings_percent,
            'subscriber_count': subscriber_count,
            'max_subscribers': template.max_subscribers,
            'spots_available': (template.max_subscribers - subscriber_count) if template.max_subscribers else None
        }
    
    # Client Subscription Management
    
    async def create_client_subscription(
        self,
        db: Session,
        client_id: int,
        template_id: int,
        payment_method_id: Optional[str] = None,
        custom_pricing: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a new subscription for a client.
        
        Args:
            db: Database session
            client_id: ID of subscribing client
            template_id: ID of subscription template
            payment_method_id: Stripe payment method ID
            custom_pricing: Optional custom pricing overrides
            
        Returns:
            Dict containing subscription details
        """
        # Validate template exists and is available
        template = db.query(ServiceSubscriptionTemplate).filter_by(id=template_id).first()
        if not template or not template.is_active:
            raise ValueError(f"Template {template_id} not found or inactive")
        
        # Check subscriber limits
        if template.max_subscribers:
            current_count = db.query(ServiceSubscription).filter(
                and_(
                    ServiceSubscription.template_id == template_id,
                    ServiceSubscription.status == SubscriptionStatus.ACTIVE
                )
            ).count()
            
            if current_count >= template.max_subscribers:
                raise ValueError("Template has reached maximum subscriber limit")
        
        # Validate client exists
        client = db.query(User).filter_by(id=client_id).first()
        if not client:
            raise ValueError(f"Client {client_id} not found")
        
        # Check for existing active subscription with same barber
        existing = db.query(ServiceSubscription).filter(
            and_(
                ServiceSubscription.client_id == client_id,
                ServiceSubscription.barber_id == template.barber_id,
                ServiceSubscription.status == SubscriptionStatus.ACTIVE
            )
        ).first()
        
        if existing:
            raise ValueError(f"Client already has active subscription with barber {template.barber_id}")
        
        # Create subscription
        subscription = ServiceSubscription(
            client_id=client_id,
            barber_id=template.barber_id,
            template_id=template_id,
            status=SubscriptionStatus.DRAFT if template.requires_approval else SubscriptionStatus.ACTIVE
        )
        
        # Apply custom pricing if provided
        if custom_pricing:
            subscription.custom_price = custom_pricing.get('price')
            subscription.custom_services_per_period = custom_pricing.get('services_per_period')
            subscription.custom_notes = custom_pricing.get('notes')
        
        db.add(subscription)
        db.flush()  # Get subscription ID
        
        # Set up billing if not requiring approval
        if not template.requires_approval:
            await self._activate_subscription(db, subscription, payment_method_id)
        
        db.commit()
        
        result = {
            'subscription_id': subscription.id,
            'client_id': client_id,
            'barber_id': template.barber_id,
            'template_name': template.name,
            'status': subscription.status.value,
            'price': subscription.effective_price,
            'services_per_period': subscription.effective_services_per_period,
            'billing_interval': template.billing_interval.value,
            'requires_approval': template.requires_approval
        }
        
        if subscription.stripe_subscription_id:
            result['stripe_subscription_id'] = subscription.stripe_subscription_id
        
        logger.info(f"Created subscription {subscription.id} for client {client_id}")
        return result
    
    async def _activate_subscription(
        self,
        db: Session,
        subscription: ServiceSubscription,
        payment_method_id: Optional[str] = None
    ):
        """Internal method to activate a subscription with Stripe billing"""
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        template = subscription.template
        
        # Calculate billing period
        period_start = now
        if template.billing_interval == BillingInterval.WEEKLY:
            period_end = period_start + timedelta(weeks=1)
            next_billing = period_start + timedelta(weeks=1)
        elif template.billing_interval == BillingInterval.BIWEEKLY:
            period_end = period_start + timedelta(weeks=2)
            next_billing = period_start + timedelta(weeks=2)
        elif template.billing_interval == BillingInterval.MONTHLY:
            period_end = period_start + relativedelta(months=1)
            next_billing = period_start + relativedelta(months=1)
        elif template.billing_interval == BillingInterval.QUARTERLY:
            period_end = period_start + relativedelta(months=3)
            next_billing = period_start + relativedelta(months=3)
        elif template.billing_interval == BillingInterval.ANNUALLY:
            period_end = period_start + relativedelta(years=1)
            next_billing = period_start + relativedelta(years=1)
        else:  # ONE_TIME
            period_end = period_start + relativedelta(years=1)  # Valid for 1 year
            next_billing = None  # No recurring billing
        
        # Create Stripe subscription if enabled
        stripe_subscription_id = None
        if self.stripe_enabled and payment_method_id and template.billing_interval != BillingInterval.ONE_TIME:
            stripe_subscription_id = await self._create_stripe_subscription(
                subscription, payment_method_id
            )
        
        # Update subscription
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.started_at = now
        subscription.current_period_start = period_start
        subscription.current_period_end = period_end
        subscription.next_billing_date = next_billing
        subscription.total_services_available = subscription.effective_services_per_period
        subscription.stripe_subscription_id = stripe_subscription_id
        
        # Set expiration date if subscription has duration
        if template.duration_months:
            subscription.expires_at = period_start + relativedelta(months=template.duration_months)
    
    async def _create_stripe_subscription(
        self,
        subscription: ServiceSubscription,
        payment_method_id: str
    ) -> Optional[str]:
        """Create Stripe subscription for recurring billing"""
        try:
            # Create or retrieve Stripe customer
            client = subscription.client
            
            stripe_customer = None
            if client.stripe_customer_id:
                # Retrieve existing customer
                stripe_customer = stripe.Customer.retrieve(client.stripe_customer_id)
            else:
                # Create new customer
                stripe_customer = stripe.Customer.create(
                    email=client.email,
                    name=client.name,
                    event_metadata={
                        'user_id': str(client.id),
                        'barber_id': str(subscription.barber_id),
                        'subscription_id': str(subscription.id)
                    }
                )
                client.stripe_customer_id = stripe_customer.id
            
            # Attach payment method to customer
            stripe.PaymentMethod.attach(
                payment_method_id,
                customer=stripe_customer.id
            )
            
            # Set as default payment method
            stripe.Customer.modify(
                stripe_customer.id,
                invoice_settings={'default_payment_method': payment_method_id}
            )
            
            # Create Stripe price object for this subscription
            template = subscription.template
            price_data = {
                'currency': 'usd',
                'product_data': {
                    'name': f"{template.name} - {subscription.barber.name}",
                    'description': template.description
                },
                'unit_amount': int(subscription.effective_price * 100),  # Stripe uses cents
                'recurring': {}
            }
            
            # Set billing interval
            if template.billing_interval == BillingInterval.WEEKLY:
                price_data['recurring'] = {'interval': 'week', 'interval_count': 1}
            elif template.billing_interval == BillingInterval.BIWEEKLY:
                price_data['recurring'] = {'interval': 'week', 'interval_count': 2}
            elif template.billing_interval == BillingInterval.MONTHLY:
                price_data['recurring'] = {'interval': 'month', 'interval_count': 1}
            elif template.billing_interval == BillingInterval.QUARTERLY:
                price_data['recurring'] = {'interval': 'month', 'interval_count': 3}
            elif template.billing_interval == BillingInterval.ANNUALLY:
                price_data['recurring'] = {'interval': 'year', 'interval_count': 1}
            
            # Create Stripe subscription
            stripe_subscription = stripe.Subscription.create(
                customer=stripe_customer.id,
                items=[{'price_data': price_data}],
                event_metadata={
                    'subscription_id': str(subscription.id),
                    'client_id': str(subscription.client_id),
                    'barber_id': str(subscription.barber_id),
                    'template_id': str(subscription.template_id)
                },
                expand=['latest_invoice.payment_intent']
            )
            
            # Update subscription with Stripe IDs
            subscription.stripe_customer_id = stripe_customer.id
            
            logger.info(f"Created Stripe subscription {stripe_subscription.id} for subscription {subscription.id}")
            return stripe_subscription.id
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating subscription: {e}")
            # Create billing event for the failure
            billing_event = SubscriptionBillingEvent(
                subscription_id=subscription.id,
                event_type='subscription_creation_failed',
                success=False,
                error_message=str(e)
            )
            subscription.db.add(billing_event)
            raise ValueError(f"Failed to create Stripe subscription: {e}")
        
        return None
    
    # Service Usage and Booking
    
    def can_client_book_service(
        self,
        db: Session,
        client_id: int,
        barber_id: int,
        service_id: int
    ) -> Tuple[bool, Optional[ServiceSubscription], str]:
        """
        Check if client can book a service using their subscription.
        
        Returns:
            Tuple of (can_book, subscription, reason)
        """
        # Find active subscription between client and barber
        subscription = db.query(ServiceSubscription).filter(
            and_(
                ServiceSubscription.client_id == client_id,
                ServiceSubscription.barber_id == barber_id,
                ServiceSubscription.status == SubscriptionStatus.ACTIVE
            )
        ).first()
        
        if not subscription:
            return False, None, "No active subscription with this barber"
        
        # Check if subscription allows this service
        if not subscription.can_book_service(service_id):
            if subscription.services_remaining_current_period <= 0:
                return False, subscription, f"No services remaining this billing period (used {subscription.services_used_current_period}/{subscription.effective_services_per_period})"
            else:
                return False, subscription, "This service is not included in your subscription"
        
        return True, subscription, "Can book with subscription"
    
    def use_subscription_service(
        self,
        db: Session,
        subscription_id: int,
        service_id: int,
        appointment_id: int
    ) -> SubscriptionUsageRecord:
        """
        Record usage of a service from a subscription.
        Links an appointment to subscription consumption.
        """
        subscription = db.query(ServiceSubscription).filter_by(id=subscription_id).first()
        if not subscription:
            raise ValueError(f"Subscription {subscription_id} not found")
        
        # Use the subscription's built-in method
        usage_record = subscription.use_service(service_id, appointment_id, db)
        
        logger.info(f"Used service {service_id} from subscription {subscription_id} for appointment {appointment_id}")
        return usage_record
    
    def get_client_subscription_status(
        self,
        db: Session,
        client_id: int,
        barber_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get status of all client subscriptions, optionally filtered by barber"""
        query = db.query(ServiceSubscription).filter_by(client_id=client_id)
        
        if barber_id:
            query = query.filter_by(barber_id=barber_id)
        
        subscriptions = query.order_by(desc(ServiceSubscription.created_at)).all()
        
        result = []
        for sub in subscriptions:
            result.append({
                'subscription_id': sub.id,
                'barber_name': sub.barber.name,
                'template_name': sub.template.name,
                'status': sub.status.value,
                'price': sub.effective_price,
                'billing_interval': sub.template.billing_interval.value,
                'services_per_period': sub.effective_services_per_period,
                'services_used_current_period': sub.services_used_current_period,
                'services_remaining': sub.services_remaining_current_period,
                'current_period_start': sub.current_period_start.isoformat() if sub.current_period_start else None,
                'current_period_end': sub.current_period_end.isoformat() if sub.current_period_end else None,
                'next_billing_date': sub.next_billing_date.isoformat() if sub.next_billing_date else None,
                'expires_at': sub.expires_at.isoformat() if sub.expires_at else None
            })
        
        return result
    
    # Billing and Lifecycle Management
    
    async def process_billing_cycle(
        self,
        db: Session,
        subscription_id: int
    ) -> Dict[str, Any]:
        """Process billing for a subscription and reset service allocation"""
        subscription = db.query(ServiceSubscription).filter_by(id=subscription_id).first()
        if not subscription:
            raise ValueError(f"Subscription {subscription_id} not found")
        
        if subscription.status != SubscriptionStatus.ACTIVE:
            raise ValueError(f"Subscription {subscription_id} is not active")
        
        template = subscription.template
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        
        # Calculate next billing period
        next_period_start = subscription.current_period_end
        if template.billing_interval == BillingInterval.WEEKLY:
            next_period_end = next_period_start + timedelta(weeks=1)
            next_billing = next_period_start + timedelta(weeks=1)
        elif template.billing_interval == BillingInterval.BIWEEKLY:
            next_period_end = next_period_start + timedelta(weeks=2)
            next_billing = next_period_start + timedelta(weeks=2)
        elif template.billing_interval == BillingInterval.MONTHLY:
            next_period_end = next_period_start + relativedelta(months=1)
            next_billing = next_period_start + relativedelta(months=1)
        elif template.billing_interval == BillingInterval.QUARTERLY:
            next_period_end = next_period_start + relativedelta(months=3)
            next_billing = next_period_start + relativedelta(months=3)
        elif template.billing_interval == BillingInterval.ANNUALLY:
            next_period_end = next_period_start + relativedelta(years=1)
            next_billing = next_period_start + relativedelta(years=1)
        else:  # ONE_TIME - no recurring billing
            next_billing = None
        
        # Handle unused service rollovers
        unused_services = subscription.services_remaining_current_period
        rollover_services = 0
        
        if template.rollover_unused and unused_services > 0:
            if template.max_rollover:
                rollover_services = min(unused_services, template.max_rollover)
            else:
                rollover_services = unused_services
        
        # Reset for new period
        subscription.current_period_start = next_period_start
        subscription.current_period_end = next_period_end
        subscription.next_billing_date = next_billing
        subscription.services_used_current_period = 0
        subscription.services_rolled_over = rollover_services
        subscription.total_services_available = subscription.effective_services_per_period + rollover_services
        subscription.last_payment_date = now
        subscription.last_payment_amount = subscription.effective_price
        subscription.updated_at = now
        
        # Create billing event
        billing_event = SubscriptionBillingEvent(
            subscription_id=subscription.id,
            event_type='billing_cycle_processed',
            amount=subscription.effective_price,
            billing_period_start=next_period_start,
            billing_period_end=next_period_end,
            success=True,
            event_metadata={
                'unused_services_previous_period': unused_services,
                'rollover_services': rollover_services,
                'new_total_available': subscription.total_services_available
            }
        )
        db.add(billing_event)
        
        # Check if subscription should expire
        if subscription.expires_at and subscription.expires_at <= now:
            subscription.status = SubscriptionStatus.EXPIRED
        
        db.commit()
        
        logger.info(f"Processed billing cycle for subscription {subscription_id}")
        
        return {
            'subscription_id': subscription_id,
            'new_period_start': next_period_start.isoformat(),
            'new_period_end': next_period_end.isoformat(),
            'services_rolled_over': rollover_services,
            'total_services_available': subscription.total_services_available,
            'next_billing_date': next_billing.isoformat() if next_billing else None,
            'amount_charged': subscription.effective_price
        }
    
    async def cancel_subscription(
        self,
        db: Session,
        subscription_id: int,
        reason: Optional[str] = None,
        immediate: bool = False
    ) -> Dict[str, Any]:
        """Cancel a client subscription"""
        subscription = db.query(ServiceSubscription).filter_by(id=subscription_id).first()
        if not subscription:
            raise ValueError(f"Subscription {subscription_id} not found")
        
        if subscription.status in [SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED]:
            raise ValueError(f"Subscription {subscription_id} is already {subscription.status.value}")
        
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        
        # Cancel Stripe subscription if exists
        if subscription.stripe_subscription_id and self.stripe_enabled:
            try:
                stripe.Subscription.delete(
                    subscription.stripe_subscription_id,
                    prorate=immediate
                )
            except stripe.error.StripeError as e:
                logger.error(f"Error cancelling Stripe subscription: {e}")
        
        # Update subscription
        subscription.status = SubscriptionStatus.CANCELLED
        subscription.cancelled_at = now
        
        if immediate:
            subscription.expires_at = now
        else:
            # Let it run until end of current period
            subscription.expires_at = subscription.current_period_end
        
        # Create billing event
        billing_event = SubscriptionBillingEvent(
            subscription_id=subscription.id,
            event_type='subscription_cancelled',
            success=True,
            event_metadata={
                'cancellation_reason': reason,
                'immediate': immediate,
                'services_remaining': subscription.services_remaining_current_period
            }
        )
        db.add(billing_event)
        
        db.commit()
        
        logger.info(f"Cancelled subscription {subscription_id} (immediate: {immediate})")
        
        return {
            'subscription_id': subscription_id,
            'status': subscription.status.value,
            'cancelled_at': subscription.cancelled_at.isoformat(),
            'expires_at': subscription.expires_at.isoformat() if subscription.expires_at else None,
            'services_remaining': subscription.services_remaining_current_period,
            'immediate': immediate
        }


# Create singleton instance
service_subscription_service = ServiceSubscriptionService()