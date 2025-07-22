"""
Stripe Payment Gateway Implementation
Implements the PaymentGateway interface for Stripe
"""

import stripe
import logging
from decimal import Decimal
from datetime import datetime
from typing import Dict, List, Optional, Any
import json

from .base_gateway import (
    PaymentGateway, PaymentIntent, PaymentResult, RefundResult,
    PayoutResult, CustomerResult, WebhookEvent, GatewayError,
    GatewayType, PaymentStatus, RefundStatus, PaymentMethod
)

logger = logging.getLogger(__name__)


class StripeGateway(PaymentGateway):
    """Stripe payment gateway implementation"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.gateway_type = GatewayType.STRIPE
        
        # Configure Stripe
        stripe.api_key = config['api_key']
        self.api_version = config.get('api_version', '2023-10-16')
        self.webhook_secret = config.get('webhook_secret')
        self.connect_client_id = config.get('connect_client_id')
        
        # Set API version
        if self.api_version:
            stripe.api_version = self.api_version
        
        logger.info(f"Initialized Stripe gateway with API version {self.api_version}")
    
    @property
    def gateway_name(self) -> str:
        return "Stripe"
    
    @property
    def supported_currencies(self) -> List[str]:
        return [
            "usd", "eur", "gbp", "cad", "aud", "jpy", "chf", "dkk", "nok", "sek",
            "pln", "czk", "huf", "bgn", "hrk", "ron", "rub", "try", "ils", "sgd",
            "hkd", "mxn", "brl", "inr", "krw", "thb", "myr", "php", "idr", "vnd"
        ]
    
    @property
    def supported_countries(self) -> List[str]:
        return [
            "US", "CA", "GB", "IE", "AU", "NZ", "SG", "HK", "JP", "AT", "BE", "BG",
            "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IT", "LV",
            "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "CH",
            "BR", "MX", "MY", "TH", "IN", "PH"
        ]
    
    async def create_payment_intent(
        self,
        amount: Decimal,
        currency: str = "usd",
        metadata: Optional[Dict[str, Any]] = None,
        customer_id: Optional[str] = None,
        payment_method_types: Optional[List[str]] = None,
        **kwargs
    ) -> PaymentIntent:
        """Create a Stripe payment intent"""
        try:
            # Validate amount
            if not self.validate_amount(amount, currency):
                raise GatewayError(
                    f"Invalid amount {amount} for currency {currency}",
                    code="INVALID_AMOUNT",
                    gateway_type=self.gateway_type
                )
            
            # Prepare parameters
            params = {
                'amount': self.format_amount_for_gateway(amount, currency),
                'currency': currency.lower(),
                'metadata': metadata or {},
                'automatic_payment_methods': {'enabled': True}
            }
            
            # Add customer if provided
            if customer_id:
                params['customer'] = customer_id
            
            # Add payment method types if specified
            if payment_method_types:
                params['payment_method_types'] = payment_method_types
            
            # Add any additional Stripe-specific parameters
            for key, value in kwargs.items():
                if key not in params:  # Don't override existing params
                    params[key] = value
            
            # Create payment intent
            intent = stripe.PaymentIntent.create(**params)
            
            # Convert to standardized format
            return PaymentIntent(
                id=intent.id,
                amount=amount,
                currency=currency,
                status=self._convert_stripe_status(intent.status),
                client_secret=intent.client_secret,
                payment_method=self._convert_stripe_payment_method(intent.payment_method) if intent.payment_method else None,
                metadata=intent.metadata,
                gateway_data={
                    'stripe_intent': intent.to_dict_recursive(),
                    'application_fee_amount': intent.application_fee_amount,
                    'transfer_data': intent.transfer_data
                }
            )
            
        except stripe.StripeError as e:
            logger.error(f"Stripe payment intent creation failed: {e}")
            raise GatewayError(
                f"Stripe payment intent creation failed: {e.user_message or str(e)}",
                code=e.code,
                gateway_type=self.gateway_type
            ) from e
        except Exception as e:
            logger.error(f"Unexpected error creating Stripe payment intent: {e}")
            raise GatewayError(
                f"Unexpected error creating payment intent: {str(e)}",
                code="UNEXPECTED_ERROR",
                gateway_type=self.gateway_type
            ) from e
    
    async def confirm_payment(
        self,
        payment_intent_id: str,
        payment_method: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> PaymentResult:
        """Confirm a Stripe payment intent"""
        try:
            # Prepare confirmation parameters
            params = {}
            
            if payment_method:
                params['payment_method'] = payment_method
            
            if metadata:
                params['metadata'] = metadata
            
            # Add any additional Stripe-specific parameters
            for key, value in kwargs.items():
                if key not in params:
                    params[key] = value
            
            # Confirm payment intent
            if params:
                intent = stripe.PaymentIntent.confirm(payment_intent_id, **params)
            else:
                intent = stripe.PaymentIntent.confirm(payment_intent_id)
            
            # Get latest charges for fee information
            charges = intent.charges.data if intent.charges else []
            latest_charge = charges[0] if charges else None
            
            # Calculate fees
            fees = None
            net_amount = None
            if latest_charge and latest_charge.balance_transaction:
                balance_txn = stripe.BalanceTransaction.retrieve(latest_charge.balance_transaction)
                fees = self.format_amount_from_gateway(balance_txn.fee, intent.currency)
                net_amount = self.format_amount_from_gateway(balance_txn.net, intent.currency)
            
            # Convert to standardized format
            return PaymentResult(
                id=latest_charge.id if latest_charge else intent.id,
                payment_intent_id=intent.id,
                amount=self.format_amount_from_gateway(intent.amount, intent.currency),
                currency=intent.currency,
                status=self._convert_stripe_status(intent.status),
                payment_method=self._convert_stripe_payment_method(intent.payment_method) if intent.payment_method else None,
                fees=fees,
                net_amount=net_amount,
                gateway_transaction_id=latest_charge.id if latest_charge else None,
                metadata=intent.metadata,
                gateway_data={
                    'stripe_intent': intent.to_dict_recursive(),
                    'stripe_charge': latest_charge.to_dict_recursive() if latest_charge else None,
                    'balance_transaction': balance_txn.to_dict_recursive() if latest_charge and latest_charge.balance_transaction else None
                }
            )
            
        except stripe.StripeError as e:
            logger.error(f"Stripe payment confirmation failed: {e}")
            raise GatewayError(
                f"Stripe payment confirmation failed: {e.user_message or str(e)}",
                code=e.code,
                gateway_type=self.gateway_type
            ) from e
        except Exception as e:
            logger.error(f"Unexpected error confirming Stripe payment: {e}")
            raise GatewayError(
                f"Unexpected error confirming payment: {str(e)}",
                code="UNEXPECTED_ERROR",
                gateway_type=self.gateway_type
            ) from e
    
    async def get_payment(self, payment_id: str) -> PaymentResult:
        """Retrieve a Stripe payment (charge)"""
        try:
            # Determine if this is a payment intent or charge ID
            if payment_id.startswith('pi_'):
                # This is a payment intent ID
                intent = stripe.PaymentIntent.retrieve(payment_id)
                charges = intent.charges.data if intent.charges else []
                charge = charges[0] if charges else None
            else:
                # This is a charge ID
                charge = stripe.Charge.retrieve(payment_id)
                intent = stripe.PaymentIntent.retrieve(charge.payment_intent) if charge.payment_intent else None
            
            if not charge:
                raise GatewayError(
                    f"No charge found for payment {payment_id}",
                    code="PAYMENT_NOT_FOUND",
                    gateway_type=self.gateway_type
                )
            
            # Get balance transaction for fee information
            fees = None
            net_amount = None
            if charge.balance_transaction:
                balance_txn = stripe.BalanceTransaction.retrieve(charge.balance_transaction)
                fees = self.format_amount_from_gateway(balance_txn.fee, charge.currency)
                net_amount = self.format_amount_from_gateway(balance_txn.net, charge.currency)
            
            return PaymentResult(
                id=charge.id,
                payment_intent_id=charge.payment_intent,
                amount=self.format_amount_from_gateway(charge.amount, charge.currency),
                currency=charge.currency,
                status=self._convert_stripe_charge_status(charge.status),
                payment_method=self._convert_stripe_payment_method(charge.payment_method_details),
                fees=fees,
                net_amount=net_amount,
                gateway_transaction_id=charge.id,
                metadata=charge.metadata,
                gateway_data={
                    'stripe_charge': charge.to_dict_recursive(),
                    'stripe_intent': intent.to_dict_recursive() if intent else None,
                    'balance_transaction': balance_txn.to_dict_recursive() if charge.balance_transaction else None
                }
            )
            
        except stripe.StripeError as e:
            logger.error(f"Stripe payment retrieval failed: {e}")
            raise GatewayError(
                f"Stripe payment retrieval failed: {e.user_message or str(e)}",
                code=e.code,
                gateway_type=self.gateway_type
            ) from e
    
    async def create_refund(
        self,
        payment_id: str,
        amount: Optional[Decimal] = None,
        reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> RefundResult:
        """Create a Stripe refund"""
        try:
            # Prepare refund parameters
            params = {'charge': payment_id}
            
            if amount is not None:
                # Get the original charge to determine currency
                charge = stripe.Charge.retrieve(payment_id)
                params['amount'] = self.format_amount_for_gateway(amount, charge.currency)
            
            if reason:
                # Map reason to Stripe's expected values
                stripe_reason = self._convert_refund_reason(reason)
                if stripe_reason:
                    params['reason'] = stripe_reason
            
            if metadata:
                params['metadata'] = metadata
            
            # Add any additional Stripe-specific parameters
            for key, value in kwargs.items():
                if key not in params:
                    params[key] = value
            
            # Create refund
            refund = stripe.Refund.create(**params)
            
            return RefundResult(
                id=refund.id,
                payment_id=payment_id,
                amount=self.format_amount_from_gateway(refund.amount, refund.currency),
                currency=refund.currency,
                status=self._convert_stripe_refund_status(refund.status),
                reason=refund.reason,
                gateway_refund_id=refund.id,
                metadata=refund.metadata,
                gateway_data={'stripe_refund': refund.to_dict_recursive()}
            )
            
        except stripe.StripeError as e:
            logger.error(f"Stripe refund creation failed: {e}")
            raise GatewayError(
                f"Stripe refund creation failed: {e.user_message or str(e)}",
                code=e.code,
                gateway_type=self.gateway_type
            ) from e
    
    async def get_refund(self, refund_id: str) -> RefundResult:
        """Retrieve a Stripe refund"""
        try:
            refund = stripe.Refund.retrieve(refund_id)
            
            return RefundResult(
                id=refund.id,
                payment_id=refund.charge,
                amount=self.format_amount_from_gateway(refund.amount, refund.currency),
                currency=refund.currency,
                status=self._convert_stripe_refund_status(refund.status),
                reason=refund.reason,
                gateway_refund_id=refund.id,
                metadata=refund.metadata,
                gateway_data={'stripe_refund': refund.to_dict_recursive()}
            )
            
        except stripe.StripeError as e:
            logger.error(f"Stripe refund retrieval failed: {e}")
            raise GatewayError(
                f"Stripe refund retrieval failed: {e.user_message or str(e)}",
                code=e.code,
                gateway_type=self.gateway_type
            ) from e
    
    async def create_customer(
        self,
        email: Optional[str] = None,
        name: Optional[str] = None,
        phone: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> CustomerResult:
        """Create a Stripe customer"""
        try:
            params = {}
            
            if email:
                params['email'] = email
            if name:
                params['name'] = name
            if phone:
                params['phone'] = phone
            if metadata:
                params['metadata'] = metadata
            
            # Add any additional Stripe-specific parameters
            for key, value in kwargs.items():
                if key not in params:
                    params[key] = value
            
            customer = stripe.Customer.create(**params)
            
            return CustomerResult(
                id=customer.id,
                email=customer.email,
                name=customer.name,
                phone=customer.phone,
                gateway_customer_id=customer.id,
                metadata=customer.metadata,
                gateway_data={'stripe_customer': customer.to_dict_recursive()}
            )
            
        except stripe.StripeError as e:
            logger.error(f"Stripe customer creation failed: {e}")
            raise GatewayError(
                f"Stripe customer creation failed: {e.user_message or str(e)}",
                code=e.code,
                gateway_type=self.gateway_type
            ) from e
    
    async def get_customer(self, customer_id: str) -> CustomerResult:
        """Retrieve a Stripe customer"""
        try:
            customer = stripe.Customer.retrieve(customer_id)
            
            return CustomerResult(
                id=customer.id,
                email=customer.email,
                name=customer.name,
                phone=customer.phone,
                gateway_customer_id=customer.id,
                metadata=customer.metadata,
                gateway_data={'stripe_customer': customer.to_dict_recursive()}
            )
            
        except stripe.StripeError as e:
            logger.error(f"Stripe customer retrieval failed: {e}")
            raise GatewayError(
                f"Stripe customer retrieval failed: {e.user_message or str(e)}",
                code=e.code,
                gateway_type=self.gateway_type
            ) from e
    
    async def create_payout(
        self,
        amount: Decimal,
        destination_account: str,
        currency: str = "usd",
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> PayoutResult:
        """Create a Stripe payout (transfer to connected account)"""
        try:
            # Use Transfer for connected accounts
            params = {
                'amount': self.format_amount_for_gateway(amount, currency),
                'currency': currency.lower(),
                'destination': destination_account
            }
            
            if metadata:
                params['metadata'] = metadata
            
            # Add any additional Stripe-specific parameters
            for key, value in kwargs.items():
                if key not in params:
                    params[key] = value
            
            transfer = stripe.Transfer.create(**params)
            
            return PayoutResult(
                id=transfer.id,
                amount=amount,
                currency=currency,
                status="completed",  # Transfers are typically immediate
                destination_account=destination_account,
                gateway_payout_id=transfer.id,
                estimated_arrival=None,  # Transfers are immediate
                metadata=transfer.metadata,
                gateway_data={'stripe_transfer': transfer.to_dict_recursive()}
            )
            
        except stripe.StripeError as e:
            logger.error(f"Stripe payout creation failed: {e}")
            raise GatewayError(
                f"Stripe payout creation failed: {e.user_message or str(e)}",
                code=e.code,
                gateway_type=self.gateway_type
            ) from e
    
    async def verify_webhook(
        self,
        payload: bytes,
        signature: str,
        secret: str
    ) -> bool:
        """Verify Stripe webhook signature"""
        try:
            stripe.Webhook.construct_event(payload, signature, secret)
            return True
        except ValueError:
            logger.error("Invalid Stripe webhook payload")
            return False
        except stripe.SignatureVerificationError:
            logger.error("Invalid Stripe webhook signature")
            return False
    
    async def parse_webhook_event(
        self,
        payload: bytes,
        signature: str,
        secret: str
    ) -> WebhookEvent:
        """Parse and verify a Stripe webhook event"""
        try:
            event = stripe.Webhook.construct_event(payload, signature, secret)
            
            return WebhookEvent(
                id=event['id'],
                type=event['type'],
                data=event['data'],
                created=datetime.fromtimestamp(event['created']),
                livemode=event['livemode'],
                gateway_type=self.gateway_type,
                raw_event=event
            )
            
        except ValueError as e:
            raise GatewayError(
                f"Invalid Stripe webhook payload: {str(e)}",
                code="INVALID_WEBHOOK_PAYLOAD",
                gateway_type=self.gateway_type
            ) from e
        except stripe.SignatureVerificationError as e:
            raise GatewayError(
                f"Invalid Stripe webhook signature: {str(e)}",
                code="INVALID_WEBHOOK_SIGNATURE",
                gateway_type=self.gateway_type
            ) from e
    
    async def health_check(self) -> Dict[str, Any]:
        """Check Stripe gateway health"""
        try:
            start_time = datetime.now()
            
            # Simple API call to test connectivity
            balance = stripe.Balance.retrieve()
            
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return {
                "healthy": True,
                "response_time_ms": response_time,
                "api_version": stripe.api_version,
                "available_balance": balance.available,
                "pending_balance": balance.pending
            }
            
        except Exception as e:
            logger.error(f"Stripe health check failed: {e}")
            return {
                "healthy": False,
                "error": str(e),
                "api_version": stripe.api_version
            }
    
    async def get_supported_features(self) -> Dict[str, bool]:
        """Get Stripe-supported features"""
        return {
            "payment_intents": True,
            "payment_methods": True,
            "customers": True,
            "refunds": True,
            "partial_refunds": True,
            "payouts": True,
            "transfers": True,
            "connected_accounts": True,
            "subscriptions": True,
            "setup_intents": True,
            "webhooks": True,
            "idempotency": True,
            "3d_secure": True,
            "apple_pay": True,
            "google_pay": True,
            "ach_payments": True,
            "bank_transfers": True,
            "installments": True,
            "marketplace": True
        }
    
    # Helper methods for converting between Stripe and standardized formats
    
    def _convert_stripe_status(self, stripe_status: str) -> PaymentStatus:
        """Convert Stripe payment intent status to standardized status"""
        status_map = {
            'requires_payment_method': PaymentStatus.PENDING,
            'requires_confirmation': PaymentStatus.PENDING,
            'requires_action': PaymentStatus.REQUIRES_ACTION,
            'processing': PaymentStatus.PROCESSING,
            'requires_capture': PaymentStatus.PROCESSING,
            'canceled': PaymentStatus.CANCELED,
            'succeeded': PaymentStatus.SUCCEEDED
        }
        return status_map.get(stripe_status, PaymentStatus.PENDING)
    
    def _convert_stripe_charge_status(self, stripe_status: str) -> PaymentStatus:
        """Convert Stripe charge status to standardized status"""
        status_map = {
            'pending': PaymentStatus.PENDING,
            'succeeded': PaymentStatus.SUCCEEDED,
            'failed': PaymentStatus.FAILED
        }
        return status_map.get(stripe_status, PaymentStatus.PENDING)
    
    def _convert_stripe_refund_status(self, stripe_status: str) -> RefundStatus:
        """Convert Stripe refund status to standardized status"""
        status_map = {
            'pending': RefundStatus.PENDING,
            'succeeded': RefundStatus.SUCCEEDED,
            'failed': RefundStatus.FAILED,
            'canceled': RefundStatus.CANCELED
        }
        return status_map.get(stripe_status, RefundStatus.PENDING)
    
    def _convert_stripe_payment_method(self, stripe_pm) -> Optional[PaymentMethod]:
        """Convert Stripe payment method to standardized format"""
        if not stripe_pm:
            return None
        
        # Handle both payment method objects and payment method details
        if hasattr(stripe_pm, 'type'):
            pm_type = stripe_pm.type
            pm_id = getattr(stripe_pm, 'id', None)
        else:
            pm_type = stripe_pm.get('type')
            pm_id = None
        
        payment_method = PaymentMethod(
            id=pm_id or "unknown",
            type=pm_type
        )
        
        # Extract card details if available
        if pm_type == 'card':
            card_data = None
            if hasattr(stripe_pm, 'card'):
                card_data = stripe_pm.card
            elif isinstance(stripe_pm, dict) and 'card' in stripe_pm:
                card_data = stripe_pm['card']
            
            if card_data:
                payment_method.card_last4 = card_data.get('last4')
                payment_method.card_brand = card_data.get('brand')
                payment_method.card_exp_month = card_data.get('exp_month')
                payment_method.card_exp_year = card_data.get('exp_year')
        
        return payment_method
    
    def _convert_refund_reason(self, reason: str) -> Optional[str]:
        """Convert generic refund reason to Stripe's expected values"""
        reason_map = {
            'duplicate': 'duplicate',
            'fraudulent': 'fraudulent',
            'requested_by_customer': 'requested_by_customer',
            'customer_request': 'requested_by_customer',
            'chargeback': 'fraudulent',
            'error': 'duplicate',
            'other': None  # Don't set reason for 'other'
        }
        return reason_map.get(reason.lower())


# Register the Stripe gateway with the factory
from .gateway_factory import PaymentGatewayFactory
PaymentGatewayFactory.register_gateway(GatewayType.STRIPE, StripeGateway)