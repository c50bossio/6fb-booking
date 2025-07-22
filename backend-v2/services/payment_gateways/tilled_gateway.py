"""
Tilled Payment Gateway Implementation
Implements the PaymentGateway interface for Tilled.com
"""

import aiohttp
import logging
import hmac
import hashlib
import json
from decimal import Decimal
from datetime import datetime
from typing import Dict, List, Optional, Any
import base64

from .base_gateway import (
    PaymentGateway, PaymentIntent, PaymentResult, RefundResult,
    PayoutResult, CustomerResult, WebhookEvent, GatewayError,
    GatewayType, PaymentStatus, RefundStatus, PaymentMethod
)

logger = logging.getLogger(__name__)


class TilledGateway(PaymentGateway):
    """Tilled payment gateway implementation"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.gateway_type = GatewayType.TILLED
        
        # Tilled configuration
        self.api_key = config['api_key']
        self.webhook_secret = config.get('webhook_secret')
        self.environment = config.get('environment', 'sandbox')
        self.account_id = config.get('account_id')
        
        # API endpoints
        if self.environment == 'production':
            self.base_url = "https://api.tilled.com"
        else:
            self.base_url = "https://sandbox-api.tilled.com"
        
        # HTTP session for connection pooling
        self.session = None
        
        logger.info(f"Initialized Tilled gateway for {self.environment} environment")
    
    async def _ensure_session(self):
        """Ensure HTTP session is available"""
        if not self.session:
            self.session = aiohttp.ClientSession(
                headers={
                    'Authorization': f'Bearer {self.api_key}',
                    'Content-Type': 'application/json',
                    'User-Agent': 'BookedBarber-V2/1.0'
                },
                timeout=aiohttp.ClientTimeout(total=30)
            )
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make authenticated request to Tilled API"""
        await self._ensure_session()
        
        url = f"{self.base_url}{endpoint}"
        
        try:
            async with self.session.request(
                method,
                url,
                json=data,
                params=params
            ) as response:
                response_data = await response.json()
                
                if response.status >= 400:
                    error_message = response_data.get('message', 'Unknown error')
                    error_code = response_data.get('code', 'UNKNOWN_ERROR')
                    
                    logger.error(f"Tilled API error {response.status}: {error_message}")
                    raise GatewayError(
                        f"Tilled API error: {error_message}",
                        code=error_code,
                        gateway_type=self.gateway_type
                    )
                
                return response_data
                
        except aiohttp.ClientError as e:
            logger.error(f"Tilled API request failed: {e}")
            raise GatewayError(
                f"Tilled API request failed: {str(e)}",
                code="API_REQUEST_FAILED",
                gateway_type=self.gateway_type
            ) from e
    
    @property
    def gateway_name(self) -> str:
        return "Tilled"
    
    @property
    def supported_currencies(self) -> List[str]:
        return ["usd"]  # Tilled primarily supports USD
    
    @property
    def supported_countries(self) -> List[str]:
        return ["US"]  # Tilled focuses on US market
    
    async def create_payment_intent(
        self,
        amount: Decimal,
        currency: str = "usd",
        metadata: Optional[Dict[str, Any]] = None,
        customer_id: Optional[str] = None,
        payment_method_types: Optional[List[str]] = None,
        **kwargs
    ) -> PaymentIntent:
        """Create a Tilled payment intent"""
        try:
            # Validate amount and currency
            if not self.validate_amount(amount, currency):
                raise GatewayError(
                    f"Invalid amount {amount} for currency {currency}",
                    code="INVALID_AMOUNT",
                    gateway_type=self.gateway_type
                )
            
            if currency.lower() != "usd":
                raise GatewayError(
                    f"Tilled does not support currency {currency}",
                    code="UNSUPPORTED_CURRENCY",
                    gateway_type=self.gateway_type
                )
            
            # Prepare payment intent data
            data = {
                'amount': self.format_amount_for_gateway(amount, currency),
                'currency': currency.lower(),
                'metadata': metadata or {}
            }
            
            # Add customer if provided
            if customer_id:
                data['customer_id'] = customer_id
            
            # Add account ID if configured
            if self.account_id:
                data['tilled_account'] = self.account_id
            
            # Add payment method types if specified
            if payment_method_types:
                data['payment_method_types'] = payment_method_types
            else:
                data['payment_method_types'] = ['card']  # Default to card
            
            # Add any additional Tilled-specific parameters
            for key, value in kwargs.items():
                if key not in data:
                    data[key] = value
            
            # Create payment intent
            response = await self._make_request('POST', '/v1/payment-intents', data=data)
            
            # Convert to standardized format
            return PaymentIntent(
                id=response['id'],
                amount=amount,
                currency=currency,
                status=self._convert_tilled_status(response['status']),
                client_secret=response.get('client_secret'),
                payment_method=self._convert_tilled_payment_method(response.get('payment_method')),
                metadata=response.get('metadata', {}),
                gateway_data={
                    'tilled_intent': response,
                    'account_id': self.account_id
                }
            )
            
        except GatewayError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating Tilled payment intent: {e}")
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
        """Confirm a Tilled payment intent"""
        try:
            # Prepare confirmation data
            data = {}
            
            if payment_method:
                data['payment_method'] = payment_method
            
            if metadata:
                data['metadata'] = metadata
            
            # Add any additional Tilled-specific parameters
            for key, value in kwargs.items():
                if key not in data:
                    data[key] = value
            
            # Confirm payment intent
            response = await self._make_request(
                'POST',
                f'/v1/payment-intents/{payment_intent_id}/confirm',
                data=data if data else None
            )
            
            # Get latest charge information
            charges = response.get('charges', {}).get('data', [])
            latest_charge = charges[0] if charges else {}
            
            # Calculate fees from charge data
            fees = None
            net_amount = None
            if latest_charge.get('balance_transaction'):
                balance_txn = latest_charge['balance_transaction']
                fees = self.format_amount_from_gateway(balance_txn.get('fee', 0), response['currency'])
                net_amount = self.format_amount_from_gateway(balance_txn.get('net', 0), response['currency'])
            
            # Convert to standardized format
            return PaymentResult(
                id=latest_charge.get('id', response['id']),
                payment_intent_id=response['id'],
                amount=self.format_amount_from_gateway(response['amount'], response['currency']),
                currency=response['currency'],
                status=self._convert_tilled_status(response['status']),
                payment_method=self._convert_tilled_payment_method(response.get('payment_method')),
                fees=fees,
                net_amount=net_amount,
                gateway_transaction_id=latest_charge.get('id'),
                metadata=response.get('metadata', {}),
                gateway_data={
                    'tilled_intent': response,
                    'tilled_charge': latest_charge,
                    'account_id': self.account_id
                }
            )
            
        except GatewayError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error confirming Tilled payment: {e}")
            raise GatewayError(
                f"Unexpected error confirming payment: {str(e)}",
                code="UNEXPECTED_ERROR",
                gateway_type=self.gateway_type
            ) from e
    
    async def get_payment(self, payment_id: str) -> PaymentResult:
        """Retrieve a Tilled payment"""
        try:
            # Determine if this is a payment intent or charge ID
            if payment_id.startswith('pi_'):
                # This is a payment intent ID
                response = await self._make_request('GET', f'/v1/payment-intents/{payment_id}')
                
                # Get charges
                charges = response.get('charges', {}).get('data', [])
                charge = charges[0] if charges else {}
            else:
                # This is a charge ID
                charge = await self._make_request('GET', f'/v1/charges/{payment_id}')
                response = await self._make_request('GET', f'/v1/payment-intents/{charge["payment_intent"]}') if charge.get('payment_intent') else {}
            
            if not charge:
                raise GatewayError(
                    f"No charge found for payment {payment_id}",
                    code="PAYMENT_NOT_FOUND",
                    gateway_type=self.gateway_type
                )
            
            # Calculate fees
            fees = None
            net_amount = None
            if charge.get('balance_transaction'):
                balance_txn = charge['balance_transaction']
                fees = self.format_amount_from_gateway(balance_txn.get('fee', 0), charge['currency'])
                net_amount = self.format_amount_from_gateway(balance_txn.get('net', 0), charge['currency'])
            
            return PaymentResult(
                id=charge['id'],
                payment_intent_id=charge.get('payment_intent'),
                amount=self.format_amount_from_gateway(charge['amount'], charge['currency']),
                currency=charge['currency'],
                status=self._convert_tilled_charge_status(charge['status']),
                payment_method=self._convert_tilled_payment_method(charge.get('payment_method_details')),
                fees=fees,
                net_amount=net_amount,
                gateway_transaction_id=charge['id'],
                metadata=charge.get('metadata', {}),
                gateway_data={
                    'tilled_charge': charge,
                    'tilled_intent': response,
                    'account_id': self.account_id
                }
            )
            
        except GatewayError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error retrieving Tilled payment: {e}")
            raise GatewayError(
                f"Unexpected error retrieving payment: {str(e)}",
                code="UNEXPECTED_ERROR",
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
        """Create a Tilled refund"""
        try:
            # Prepare refund data
            data = {'charge': payment_id}
            
            if amount is not None:
                # Get the original charge to determine currency
                charge = await self._make_request('GET', f'/v1/charges/{payment_id}')
                data['amount'] = self.format_amount_for_gateway(amount, charge['currency'])
            
            if reason:
                data['reason'] = reason
            
            if metadata:
                data['metadata'] = metadata
            
            # Add any additional Tilled-specific parameters
            for key, value in kwargs.items():
                if key not in data:
                    data[key] = value
            
            # Create refund
            response = await self._make_request('POST', '/v1/refunds', data=data)
            
            return RefundResult(
                id=response['id'],
                payment_id=payment_id,
                amount=self.format_amount_from_gateway(response['amount'], response['currency']),
                currency=response['currency'],
                status=self._convert_tilled_refund_status(response['status']),
                reason=response.get('reason'),
                gateway_refund_id=response['id'],
                metadata=response.get('metadata', {}),
                gateway_data={'tilled_refund': response}
            )
            
        except GatewayError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating Tilled refund: {e}")
            raise GatewayError(
                f"Unexpected error creating refund: {str(e)}",
                code="UNEXPECTED_ERROR",
                gateway_type=self.gateway_type
            ) from e
    
    async def get_refund(self, refund_id: str) -> RefundResult:
        """Retrieve a Tilled refund"""
        try:
            response = await self._make_request('GET', f'/v1/refunds/{refund_id}')
            
            return RefundResult(
                id=response['id'],
                payment_id=response['charge'],
                amount=self.format_amount_from_gateway(response['amount'], response['currency']),
                currency=response['currency'],
                status=self._convert_tilled_refund_status(response['status']),
                reason=response.get('reason'),
                gateway_refund_id=response['id'],
                metadata=response.get('metadata', {}),
                gateway_data={'tilled_refund': response}
            )
            
        except GatewayError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error retrieving Tilled refund: {e}")
            raise GatewayError(
                f"Unexpected error retrieving refund: {str(e)}",
                code="UNEXPECTED_ERROR",
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
        """Create a Tilled customer"""
        try:
            data = {}
            
            if email:
                data['email'] = email
            if name:
                data['name'] = name
            if phone:
                data['phone'] = phone
            if metadata:
                data['metadata'] = metadata
            
            # Add any additional Tilled-specific parameters
            for key, value in kwargs.items():
                if key not in data:
                    data[key] = value
            
            response = await self._make_request('POST', '/v1/customers', data=data)
            
            return CustomerResult(
                id=response['id'],
                email=response.get('email'),
                name=response.get('name'),
                phone=response.get('phone'),
                gateway_customer_id=response['id'],
                metadata=response.get('metadata', {}),
                gateway_data={'tilled_customer': response}
            )
            
        except GatewayError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating Tilled customer: {e}")
            raise GatewayError(
                f"Unexpected error creating customer: {str(e)}",
                code="UNEXPECTED_ERROR",
                gateway_type=self.gateway_type
            ) from e
    
    async def get_customer(self, customer_id: str) -> CustomerResult:
        """Retrieve a Tilled customer"""
        try:
            response = await self._make_request('GET', f'/v1/customers/{customer_id}')
            
            return CustomerResult(
                id=response['id'],
                email=response.get('email'),
                name=response.get('name'),
                phone=response.get('phone'),
                gateway_customer_id=response['id'],
                metadata=response.get('metadata', {}),
                gateway_data={'tilled_customer': response}
            )
            
        except GatewayError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error retrieving Tilled customer: {e}")
            raise GatewayError(
                f"Unexpected error retrieving customer: {str(e)}",
                code="UNEXPECTED_ERROR",
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
        """Create a Tilled payout/transfer"""
        try:
            data = {
                'amount': self.format_amount_for_gateway(amount, currency),
                'currency': currency.lower(),
                'destination': destination_account
            }
            
            if metadata:
                data['metadata'] = metadata
            
            # Add any additional Tilled-specific parameters
            for key, value in kwargs.items():
                if key not in data:
                    data[key] = value
            
            response = await self._make_request('POST', '/v1/transfers', data=data)
            
            return PayoutResult(
                id=response['id'],
                amount=amount,
                currency=currency,
                status=response.get('status', 'pending'),
                destination_account=destination_account,
                gateway_payout_id=response['id'],
                estimated_arrival=datetime.fromisoformat(response['estimated_arrival']) if response.get('estimated_arrival') else None,
                metadata=response.get('metadata', {}),
                gateway_data={'tilled_transfer': response}
            )
            
        except GatewayError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating Tilled payout: {e}")
            raise GatewayError(
                f"Unexpected error creating payout: {str(e)}",
                code="UNEXPECTED_ERROR",
                gateway_type=self.gateway_type
            ) from e
    
    async def verify_webhook(
        self,
        payload: bytes,
        signature: str,
        secret: str
    ) -> bool:
        """Verify Tilled webhook signature"""
        try:
            # Tilled uses HMAC-SHA256 for webhook verification
            expected_signature = hmac.new(
                secret.encode('utf-8'),
                payload,
                hashlib.sha256
            ).hexdigest()
            
            # Compare signatures (timing-safe comparison)
            return hmac.compare_digest(signature, expected_signature)
            
        except Exception as e:
            logger.error(f"Tilled webhook verification failed: {e}")
            return False
    
    async def parse_webhook_event(
        self,
        payload: bytes,
        signature: str,
        secret: str
    ) -> WebhookEvent:
        """Parse and verify a Tilled webhook event"""
        try:
            # Verify signature
            if not await self.verify_webhook(payload, signature, secret):
                raise GatewayError(
                    "Invalid Tilled webhook signature",
                    code="INVALID_WEBHOOK_SIGNATURE",
                    gateway_type=self.gateway_type
                )
            
            # Parse payload
            try:
                event_data = json.loads(payload.decode('utf-8'))
            except json.JSONDecodeError as e:
                raise GatewayError(
                    f"Invalid Tilled webhook payload: {str(e)}",
                    code="INVALID_WEBHOOK_PAYLOAD",
                    gateway_type=self.gateway_type
                ) from e
            
            return WebhookEvent(
                id=event_data.get('id', 'unknown'),
                type=event_data.get('type', 'unknown'),
                data=event_data.get('data', {}),
                created=datetime.fromisoformat(event_data.get('created', datetime.now().isoformat())),
                livemode=event_data.get('livemode', False),
                gateway_type=self.gateway_type,
                raw_event=event_data
            )
            
        except GatewayError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error parsing Tilled webhook: {e}")
            raise GatewayError(
                f"Unexpected error parsing webhook: {str(e)}",
                code="UNEXPECTED_ERROR",
                gateway_type=self.gateway_type
            ) from e
    
    async def health_check(self) -> Dict[str, Any]:
        """Check Tilled gateway health"""
        try:
            start_time = datetime.now()
            
            # Simple API call to test connectivity
            await self._make_request('GET', '/v1/accounts/self')
            
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return {
                "healthy": True,
                "response_time_ms": response_time,
                "environment": self.environment,
                "account_id": self.account_id
            }
            
        except Exception as e:
            logger.error(f"Tilled health check failed: {e}")
            return {
                "healthy": False,
                "error": str(e),
                "environment": self.environment
            }
    
    async def get_supported_features(self) -> Dict[str, bool]:
        """Get Tilled-supported features"""
        return {
            "payment_intents": True,
            "payment_methods": True,
            "customers": True,
            "refunds": True,
            "partial_refunds": True,
            "payouts": True,
            "transfers": True,
            "connected_accounts": True,
            "subscriptions": False,  # Not yet supported by Tilled
            "setup_intents": True,
            "webhooks": True,
            "idempotency": True,
            "3d_secure": True,
            "apple_pay": False,  # Limited support
            "google_pay": False,  # Limited support
            "ach_payments": True,
            "bank_transfers": True,
            "installments": False,  # Not yet supported
            "marketplace": True
        }
    
    # Helper methods for converting between Tilled and standardized formats
    
    def _convert_tilled_status(self, tilled_status: str) -> PaymentStatus:
        """Convert Tilled payment intent status to standardized status"""
        status_map = {
            'requires_payment_method': PaymentStatus.PENDING,
            'requires_confirmation': PaymentStatus.PENDING,
            'requires_action': PaymentStatus.REQUIRES_ACTION,
            'processing': PaymentStatus.PROCESSING,
            'requires_capture': PaymentStatus.PROCESSING,
            'canceled': PaymentStatus.CANCELED,
            'succeeded': PaymentStatus.SUCCEEDED,
            'failed': PaymentStatus.FAILED
        }
        return status_map.get(tilled_status, PaymentStatus.PENDING)
    
    def _convert_tilled_charge_status(self, tilled_status: str) -> PaymentStatus:
        """Convert Tilled charge status to standardized status"""
        status_map = {
            'pending': PaymentStatus.PENDING,
            'succeeded': PaymentStatus.SUCCEEDED,
            'failed': PaymentStatus.FAILED
        }
        return status_map.get(tilled_status, PaymentStatus.PENDING)
    
    def _convert_tilled_refund_status(self, tilled_status: str) -> RefundStatus:
        """Convert Tilled refund status to standardized status"""
        status_map = {
            'pending': RefundStatus.PENDING,
            'succeeded': RefundStatus.SUCCEEDED,
            'failed': RefundStatus.FAILED,
            'canceled': RefundStatus.CANCELED
        }
        return status_map.get(tilled_status, RefundStatus.PENDING)
    
    def _convert_tilled_payment_method(self, tilled_pm) -> Optional[PaymentMethod]:
        """Convert Tilled payment method to standardized format"""
        if not tilled_pm:
            return None
        
        payment_method = PaymentMethod(
            id=tilled_pm.get('id', 'unknown'),
            type=tilled_pm.get('type', 'card')
        )
        
        # Extract card details if available
        if tilled_pm.get('type') == 'card' and 'card' in tilled_pm:
            card_data = tilled_pm['card']
            payment_method.card_last4 = card_data.get('last4')
            payment_method.card_brand = card_data.get('brand')
            payment_method.card_exp_month = card_data.get('exp_month')
            payment_method.card_exp_year = card_data.get('exp_year')
        
        return payment_method
    
    def validate_amount(self, amount: Decimal, currency: str = "usd") -> bool:
        """Validate payment amount for Tilled (USD only, minimum $0.50)"""
        if currency.lower() != "usd":
            return False
        return Decimal("0.50") <= amount <= Decimal("999999.99")
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self._ensure_session()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
            self.session = None


# Register the Tilled gateway with the factory
from .gateway_factory import PaymentGatewayFactory
PaymentGatewayFactory.register_gateway(GatewayType.TILLED, TilledGateway)