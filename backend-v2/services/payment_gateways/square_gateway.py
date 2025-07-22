"""
Square Payment Gateway Implementation
Handles Square API integration for the hybrid payment system
"""

import json
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Union
import logging
import asyncio
import aiohttp
import hashlib
import hmac

from .base_gateway import (
    PaymentGateway, GatewayType, PaymentStatus, RefundStatus,
    PaymentMethod, PaymentIntent, PaymentResult, RefundResult,
    PayoutResult, CustomerResult, WebhookEvent, GatewayError
)

logger = logging.getLogger(__name__)


class SquareGateway(PaymentGateway):
    """
    Square Payment Gateway implementation for external payment processing.
    
    Supports both sandbox and production environments with comprehensive
    payment, refund, customer, and webhook operations.
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.gateway_type = GatewayType.SQUARE
        self.access_token = config.get('access_token')
        self.application_id = config.get('application_id')
        self.webhook_signature_key = config.get('webhook_signature_key')
        self.environment = config.get('environment', 'sandbox')
        
        # Set API base URL based on environment
        if self.environment == 'production':
            self.base_url = "https://connect.squareup.com"
        else:
            self.base_url = "https://connect.squareupsandbox.com"
            
        self.location_id = config.get('location_id')
        
        # Validate required configuration
        if not self.access_token:
            raise GatewayError("Square access token is required", gateway_type=self.gateway_type)
        if not self.application_id:
            raise GatewayError("Square application ID is required", gateway_type=self.gateway_type)
        if not self.location_id:
            raise GatewayError("Square location ID is required", gateway_type=self.gateway_type)
    
    @property
    def gateway_name(self) -> str:
        return "Square"
    
    @property
    def supported_currencies(self) -> List[str]:
        return ["USD", "CAD", "GBP", "EUR", "AUD", "JPY"]
    
    @property
    def supported_countries(self) -> List[str]:
        return ["US", "CA", "GB", "IE", "FR", "ES", "AU", "JP"]
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to Square API."""
        url = f"{self.base_url}{endpoint}"
        
        default_headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
            "Square-Version": "2023-10-18"
        }
        
        if headers:
            default_headers.update(headers)
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.request(
                    method=method,
                    url=url,
                    json=data,
                    headers=default_headers,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    response_data = await response.json()
                    
                    if response.status >= 400:
                        error_message = response_data.get('errors', [{}])[0].get('detail', 'Unknown error')
                        error_code = response_data.get('errors', [{}])[0].get('code', 'UNKNOWN')
                        raise GatewayError(
                            f"Square API error: {error_message}",
                            code=error_code,
                            gateway_type=self.gateway_type
                        )
                    
                    return response_data
                    
        except aiohttp.ClientError as e:
            raise GatewayError(f"Square API connection error: {str(e)}", gateway_type=self.gateway_type)
        except asyncio.TimeoutError:
            raise GatewayError("Square API request timeout", gateway_type=self.gateway_type)
    
    def _square_status_to_payment_status(self, square_status: str) -> PaymentStatus:
        """Convert Square payment status to standardized status."""
        status_mapping = {
            "APPROVED": PaymentStatus.SUCCEEDED,
            "PENDING": PaymentStatus.PENDING,
            "COMPLETED": PaymentStatus.SUCCEEDED,
            "CANCELED": PaymentStatus.CANCELED,
            "FAILED": PaymentStatus.FAILED,
        }
        return status_mapping.get(square_status.upper(), PaymentStatus.PENDING)
    
    def _square_status_to_refund_status(self, square_status: str) -> RefundStatus:
        """Convert Square refund status to standardized status."""
        status_mapping = {
            "PENDING": RefundStatus.PENDING,
            "APPROVED": RefundStatus.SUCCEEDED,
            "REJECTED": RefundStatus.FAILED,
            "COMPLETED": RefundStatus.SUCCEEDED,
            "FAILED": RefundStatus.FAILED,
        }
        return status_mapping.get(square_status.upper(), RefundStatus.PENDING)
    
    async def create_payment_intent(
        self,
        amount: Decimal,
        currency: str = "USD",
        metadata: Optional[Dict[str, Any]] = None,
        customer_id: Optional[str] = None,
        payment_method_types: Optional[List[str]] = None,
        **kwargs
    ) -> PaymentIntent:
        """Create a Square payment intent."""
        
        if not self.validate_amount(amount, currency):
            raise GatewayError(f"Invalid amount: {amount} {currency}", gateway_type=self.gateway_type)
        
        # Generate idempotency key
        idempotency_key = str(uuid.uuid4())
        
        # Convert amount to Square format (smallest currency unit)
        square_amount = self.format_amount_for_gateway(amount, currency)
        
        payment_data = {
            "idempotency_key": idempotency_key,
            "amount_money": {
                "amount": square_amount,
                "currency": currency.upper()
            },
            "source_id": "CARD_NONCE",  # Placeholder - will be replaced with actual payment method
            "autocomplete": False,  # Manual capture for payment intents
            "location_id": self.location_id,
            "reference_id": kwargs.get('reference_id'),
            "note": kwargs.get('note', f"BookedBarber appointment payment - {metadata.get('appointment_id', '') if metadata else ''}"),
        }
        
        if customer_id:
            payment_data["customer_id"] = customer_id
        
        if metadata:
            payment_data["app_fee_money"] = metadata.get('app_fee_money')
            payment_data["delay_duration"] = metadata.get('delay_duration')
        
        try:
            response = await self._make_request("POST", "/v2/payments", payment_data)
            payment = response.get("payment", {})
            
            return PaymentIntent(
                id=payment.get("id"),
                amount=amount,
                currency=currency.upper(),
                status=self._square_status_to_payment_status(payment.get("status", "PENDING")),
                client_secret=idempotency_key,  # Use idempotency key as client secret equivalent
                metadata=metadata or {},
                gateway_data={
                    "square_payment_id": payment.get("id"),
                    "idempotency_key": idempotency_key,
                    "location_id": self.location_id,
                    "reference_id": payment.get("reference_id"),
                    "raw_response": payment
                }
            )
            
        except Exception as e:
            logger.error(f"Square payment intent creation failed: {str(e)}")
            raise GatewayError(f"Failed to create Square payment intent: {str(e)}", gateway_type=self.gateway_type)
    
    async def confirm_payment(
        self,
        payment_intent_id: str,
        payment_method: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> PaymentResult:
        """Confirm a Square payment (complete the payment)."""
        
        # For Square, we complete the payment instead of confirming an intent
        complete_data = {
            "version_token": kwargs.get('version_token')
        }
        
        try:
            response = await self._make_request(
                "POST", 
                f"/v2/payments/{payment_intent_id}/complete",
                complete_data
            )
            payment = response.get("payment", {})
            
            # Extract payment method information
            card_details = payment.get("card_details", {})
            payment_method_obj = None
            
            if card_details:
                payment_method_obj = PaymentMethod(
                    id=card_details.get("card", {}).get("id", ""),
                    type="card",
                    card_last4=card_details.get("card", {}).get("last_4"),
                    card_brand=card_details.get("card", {}).get("card_brand"),
                    card_exp_month=card_details.get("card", {}).get("exp_month"),
                    card_exp_year=card_details.get("card", {}).get("exp_year"),
                    metadata=card_details.get("card", {})
                )
            
            # Calculate fees and net amount
            total_money = payment.get("total_money", {})
            amount = self.format_amount_from_gateway(total_money.get("amount", 0), total_money.get("currency", "USD"))
            
            processing_fee_money = payment.get("processing_fee", [{}])[0] if payment.get("processing_fee") else {}
            fees = self.format_amount_from_gateway(
                processing_fee_money.get("amount_money", {}).get("amount", 0),
                processing_fee_money.get("amount_money", {}).get("currency", "USD")
            )
            
            net_amount = amount - fees
            
            return PaymentResult(
                id=payment.get("id"),
                payment_intent_id=payment_intent_id,
                amount=amount,
                currency=total_money.get("currency", "USD"),
                status=self._square_status_to_payment_status(payment.get("status", "PENDING")),
                payment_method=payment_method_obj,
                fees=fees,
                net_amount=net_amount,
                gateway_transaction_id=payment.get("id"),
                metadata=metadata or {},
                gateway_data={
                    "raw_payment": payment,
                    "receipt_number": payment.get("receipt_number"),
                    "receipt_url": payment.get("receipt_url"),
                    "risk_evaluation": payment.get("risk_evaluation"),
                    "processing_fee": payment.get("processing_fee")
                }
            )
            
        except Exception as e:
            logger.error(f"Square payment confirmation failed: {str(e)}")
            raise GatewayError(f"Failed to confirm Square payment: {str(e)}", gateway_type=self.gateway_type)
    
    async def get_payment(self, payment_id: str) -> PaymentResult:
        """Retrieve Square payment details."""
        
        try:
            response = await self._make_request("GET", f"/v2/payments/{payment_id}")
            payment = response.get("payment", {})
            
            # Extract payment method information
            card_details = payment.get("card_details", {})
            payment_method_obj = None
            
            if card_details:
                payment_method_obj = PaymentMethod(
                    id=card_details.get("card", {}).get("id", ""),
                    type="card",
                    card_last4=card_details.get("card", {}).get("last_4"),
                    card_brand=card_details.get("card", {}).get("card_brand"),
                    card_exp_month=card_details.get("card", {}).get("exp_month"),
                    card_exp_year=card_details.get("card", {}).get("exp_year"),
                    metadata=card_details.get("card", {})
                )
            
            # Calculate amounts
            total_money = payment.get("total_money", {})
            amount = self.format_amount_from_gateway(total_money.get("amount", 0), total_money.get("currency", "USD"))
            
            processing_fee_money = payment.get("processing_fee", [{}])[0] if payment.get("processing_fee") else {}
            fees = self.format_amount_from_gateway(
                processing_fee_money.get("amount_money", {}).get("amount", 0),
                processing_fee_money.get("amount_money", {}).get("currency", "USD")
            )
            
            net_amount = amount - fees
            
            return PaymentResult(
                id=payment.get("id"),
                payment_intent_id=payment.get("id"),  # Square doesn't separate intent from payment
                amount=amount,
                currency=total_money.get("currency", "USD"),
                status=self._square_status_to_payment_status(payment.get("status", "PENDING")),
                payment_method=payment_method_obj,
                fees=fees,
                net_amount=net_amount,
                gateway_transaction_id=payment.get("id"),
                metadata={},
                gateway_data={
                    "raw_payment": payment,
                    "receipt_number": payment.get("receipt_number"),
                    "receipt_url": payment.get("receipt_url"),
                    "location_id": payment.get("location_id"),
                    "order_id": payment.get("order_id")
                }
            )
            
        except Exception as e:
            logger.error(f"Square payment retrieval failed: {str(e)}")
            raise GatewayError(f"Failed to retrieve Square payment: {str(e)}", gateway_type=self.gateway_type)
    
    async def create_refund(
        self,
        payment_id: str,
        amount: Optional[Decimal] = None,
        reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> RefundResult:
        """Create a Square refund."""
        
        # Get payment details to determine refund amount if not specified
        if amount is None:
            payment = await self.get_payment(payment_id)
            amount = payment.amount
        
        # Generate idempotency key
        idempotency_key = str(uuid.uuid4())
        
        # Convert amount to Square format
        square_amount = self.format_amount_for_gateway(amount, kwargs.get('currency', 'USD'))
        
        refund_data = {
            "idempotency_key": idempotency_key,
            "amount_money": {
                "amount": square_amount,
                "currency": kwargs.get('currency', 'USD').upper()
            },
            "payment_id": payment_id,
            "reason": reason or "Appointment cancellation"
        }
        
        try:
            response = await self._make_request("POST", "/v2/refunds", refund_data)
            refund = response.get("refund", {})
            
            return RefundResult(
                id=refund.get("id"),
                payment_id=payment_id,
                amount=amount,
                currency=refund.get("amount_money", {}).get("currency", "USD"),
                status=self._square_status_to_refund_status(refund.get("status", "PENDING")),
                reason=reason,
                gateway_refund_id=refund.get("id"),
                metadata=metadata or {},
                gateway_data={
                    "raw_refund": refund,
                    "idempotency_key": idempotency_key,
                    "location_id": refund.get("location_id"),
                    "processing_fee": refund.get("processing_fee")
                }
            )
            
        except Exception as e:
            logger.error(f"Square refund creation failed: {str(e)}")
            raise GatewayError(f"Failed to create Square refund: {str(e)}", gateway_type=self.gateway_type)
    
    async def get_refund(self, refund_id: str) -> RefundResult:
        """Retrieve Square refund details."""
        
        try:
            response = await self._make_request("GET", f"/v2/refunds/{refund_id}")
            refund = response.get("refund", {})
            
            amount_money = refund.get("amount_money", {})
            amount = self.format_amount_from_gateway(amount_money.get("amount", 0), amount_money.get("currency", "USD"))
            
            return RefundResult(
                id=refund.get("id"),
                payment_id=refund.get("payment_id"),
                amount=amount,
                currency=amount_money.get("currency", "USD"),
                status=self._square_status_to_refund_status(refund.get("status", "PENDING")),
                reason=refund.get("reason"),
                gateway_refund_id=refund.get("id"),
                metadata={},
                gateway_data={
                    "raw_refund": refund,
                    "location_id": refund.get("location_id"),
                    "created_at": refund.get("created_at"),
                    "updated_at": refund.get("updated_at")
                }
            )
            
        except Exception as e:
            logger.error(f"Square refund retrieval failed: {str(e)}")
            raise GatewayError(f"Failed to retrieve Square refund: {str(e)}", gateway_type=self.gateway_type)
    
    async def create_customer(
        self,
        email: Optional[str] = None,
        name: Optional[str] = None,
        phone: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> CustomerResult:
        """Create a Square customer."""
        
        customer_data = {}
        
        if name:
            # Split name into given and family name
            name_parts = name.split(" ", 1)
            customer_data["given_name"] = name_parts[0]
            if len(name_parts) > 1:
                customer_data["family_name"] = name_parts[1]
        
        if email:
            customer_data["email_address"] = email
        
        if phone:
            customer_data["phone_number"] = phone
        
        if kwargs.get('address'):
            customer_data["address"] = kwargs['address']
        
        try:
            response = await self._make_request("POST", "/v2/customers", customer_data)
            customer = response.get("customer", {})
            
            return CustomerResult(
                id=customer.get("id"),
                email=customer.get("email_address"),
                name=f"{customer.get('given_name', '')} {customer.get('family_name', '')}".strip(),
                phone=customer.get("phone_number"),
                gateway_customer_id=customer.get("id"),
                metadata=metadata or {},
                gateway_data={
                    "raw_customer": customer,
                    "creation_source": customer.get("creation_source"),
                    "preferences": customer.get("preferences"),
                    "address": customer.get("address")
                }
            )
            
        except Exception as e:
            logger.error(f"Square customer creation failed: {str(e)}")
            raise GatewayError(f"Failed to create Square customer: {str(e)}", gateway_type=self.gateway_type)
    
    async def get_customer(self, customer_id: str) -> CustomerResult:
        """Retrieve Square customer details."""
        
        try:
            response = await self._make_request("GET", f"/v2/customers/{customer_id}")
            customer = response.get("customer", {})
            
            return CustomerResult(
                id=customer.get("id"),
                email=customer.get("email_address"),
                name=f"{customer.get('given_name', '')} {customer.get('family_name', '')}".strip(),
                phone=customer.get("phone_number"),
                gateway_customer_id=customer.get("id"),
                metadata={},
                gateway_data={
                    "raw_customer": customer,
                    "creation_source": customer.get("creation_source"),
                    "group_ids": customer.get("group_ids"),
                    "segment_ids": customer.get("segment_ids")
                }
            )
            
        except Exception as e:
            logger.error(f"Square customer retrieval failed: {str(e)}")
            raise GatewayError(f"Failed to retrieve Square customer: {str(e)}", gateway_type=self.gateway_type)
    
    async def create_payout(
        self,
        amount: Decimal,
        destination_account: str,
        currency: str = "USD",
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> PayoutResult:
        """
        Create a Square payout.
        Note: Square handles payouts automatically, so this is mainly for tracking.
        """
        
        # Square doesn't have a direct payout API like Stripe
        # Payouts are handled automatically based on deposit schedule
        # We'll return a simulated result for compatibility
        
        payout_id = f"square_payout_{uuid.uuid4().hex[:16]}"
        
        return PayoutResult(
            id=payout_id,
            amount=amount,
            currency=currency.upper(),
            status="pending",
            destination_account=destination_account,
            gateway_payout_id=payout_id,
            estimated_arrival=None,  # Square determines this based on deposit schedule
            metadata=metadata or {},
            gateway_data={
                "note": "Square handles payouts automatically based on deposit schedule",
                "deposit_api_available": False,
                "automatic_deposits": True
            }
        )
    
    async def verify_webhook(
        self,
        payload: bytes,
        signature: str,
        secret: str
    ) -> bool:
        """Verify Square webhook signature."""
        
        if not secret:
            logger.warning("Square webhook secret not configured")
            return False
        
        try:
            # Square uses HMAC-SHA1 for webhook signatures
            expected_signature = hmac.new(
                secret.encode('utf-8'),
                payload,
                hashlib.sha1
            ).hexdigest()
            
            # Square signature format: "sha1=<signature>"
            if signature.startswith('sha1='):
                signature = signature[5:]
            
            return hmac.compare_digest(expected_signature, signature)
            
        except Exception as e:
            logger.error(f"Square webhook verification failed: {str(e)}")
            return False
    
    async def parse_webhook_event(
        self,
        payload: bytes,
        signature: str,
        secret: str
    ) -> WebhookEvent:
        """Parse and verify a Square webhook event."""
        
        if not await self.verify_webhook(payload, signature, secret):
            raise GatewayError("Invalid Square webhook signature", gateway_type=self.gateway_type)
        
        try:
            event_data = json.loads(payload.decode('utf-8'))
            
            return WebhookEvent(
                id=event_data.get("event_id", str(uuid.uuid4())),
                type=event_data.get("type", "unknown"),
                data=event_data.get("data", {}),
                created=datetime.now(timezone.utc),
                livemode=self.environment == 'production',
                gateway_type=self.gateway_type,
                raw_event=event_data
            )
            
        except json.JSONDecodeError as e:
            raise GatewayError(f"Invalid Square webhook payload: {str(e)}", gateway_type=self.gateway_type)
        except Exception as e:
            logger.error(f"Square webhook parsing failed: {str(e)}")
            raise GatewayError(f"Failed to parse Square webhook: {str(e)}", gateway_type=self.gateway_type)
    
    async def health_check(self) -> Dict[str, Any]:
        """Check Square API health and connectivity."""
        
        start_time = datetime.now()
        
        try:
            # Test API connectivity by fetching location info
            response = await self._make_request("GET", f"/v2/locations/{self.location_id}")
            
            end_time = datetime.now()
            response_time = (end_time - start_time).total_seconds() * 1000
            
            return {
                "gateway": "Square",
                "status": "healthy",
                "response_time_ms": response_time,
                "environment": self.environment,
                "location_id": self.location_id,
                "location_name": response.get("location", {}).get("name"),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            end_time = datetime.now()
            response_time = (end_time - start_time).total_seconds() * 1000
            
            return {
                "gateway": "Square",
                "status": "unhealthy",
                "error": str(e),
                "response_time_ms": response_time,
                "environment": self.environment,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    
    async def get_supported_features(self) -> Dict[str, bool]:
        """Get list of features supported by Square gateway."""
        
        return {
            "payments": True,
            "refunds": True,
            "partial_refunds": True,
            "customers": True,
            "payment_methods": True,
            "webhooks": True,
            "recurring_payments": True,
            "payouts": False,  # Handled automatically by Square
            "connect_accounts": False,  # Not applicable to Square
            "marketplace": False,  # Square for Restaurants/Retail, not marketplace
            "multi_currency": True,
            "saved_payment_methods": True,
            "disputes": True,
            "installments": False,
            "buy_now_pay_later": False
        }