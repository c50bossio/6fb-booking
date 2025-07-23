"""
Abstract Payment Gateway Interface
Defines the contract for all payment gateway implementations
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class GatewayType(Enum):
    """Supported payment gateway types"""
    STRIPE = "stripe"
    TILLED = "tilled"
    # Future gateways can be added here
    SQUARE = "square"
    PAYPAL = "paypal"


class PaymentStatus(Enum):
    """Standardized payment status across gateways"""
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"
    REQUIRES_ACTION = "requires_action"


class RefundStatus(Enum):
    """Standardized refund status across gateways"""
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"


@dataclass
class PaymentMethod:
    """Standardized payment method representation"""
    id: str
    type: str  # card, bank_account, etc.
    card_last4: Optional[str] = None
    card_brand: Optional[str] = None
    card_exp_month: Optional[int] = None
    card_exp_year: Optional[int] = None
    metadata: Dict[str, Any] = None


@dataclass
class PaymentIntent:
    """Standardized payment intent representation"""
    id: str
    amount: Decimal
    currency: str
    status: PaymentStatus
    client_secret: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    metadata: Dict[str, Any] = None
    gateway_data: Dict[str, Any] = None  # Gateway-specific data


@dataclass
class PaymentResult:
    """Standardized payment result representation"""
    id: str
    payment_intent_id: str
    amount: Decimal
    currency: str
    status: PaymentStatus
    payment_method: Optional[PaymentMethod] = None
    fees: Optional[Decimal] = None
    net_amount: Optional[Decimal] = None
    gateway_transaction_id: Optional[str] = None
    metadata: Dict[str, Any] = None
    gateway_data: Dict[str, Any] = None


@dataclass
class RefundResult:
    """Standardized refund result representation"""
    id: str
    payment_id: str
    amount: Decimal
    currency: str
    status: RefundStatus
    reason: Optional[str] = None
    gateway_refund_id: Optional[str] = None
    metadata: Dict[str, Any] = None
    gateway_data: Dict[str, Any] = None


@dataclass
class PayoutResult:
    """Standardized payout result representation"""
    id: str
    amount: Decimal
    currency: str
    status: str
    destination_account: str
    gateway_payout_id: Optional[str] = None
    estimated_arrival: Optional[datetime] = None
    metadata: Dict[str, Any] = None
    gateway_data: Dict[str, Any] = None


@dataclass
class CustomerResult:
    """Standardized customer result representation"""
    id: str
    email: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    gateway_customer_id: Optional[str] = None
    metadata: Dict[str, Any] = None
    gateway_data: Dict[str, Any] = None


@dataclass
class WebhookEvent:
    """Standardized webhook event representation"""
    id: str
    type: str
    data: Dict[str, Any]
    created: datetime
    livemode: bool
    gateway_type: GatewayType
    raw_event: Dict[str, Any]  # Original gateway event


class GatewayError(Exception):
    """Base exception for gateway errors"""
    
    def __init__(self, message: str, code: Optional[str] = None, gateway_type: Optional[GatewayType] = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.gateway_type = gateway_type


class PaymentGateway(ABC):
    """
    Abstract base class for payment gateway implementations.
    
    This interface defines the contract that all payment gateway implementations
    must follow to ensure consistent behavior across different providers.
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the payment gateway with configuration.
        
        Args:
            config: Gateway-specific configuration including API keys, URLs, etc.
        """
        self.config = config
        self.gateway_type: GatewayType = None
        self.is_test_mode = config.get('test_mode', True)
        
    @property
    @abstractmethod
    def gateway_name(self) -> str:
        """Return the name of the gateway (e.g., 'Stripe', 'Tilled')"""
        pass
    
    @property
    @abstractmethod
    def supported_currencies(self) -> List[str]:
        """Return list of supported currencies"""
        pass
    
    @property
    @abstractmethod
    def supported_countries(self) -> List[str]:
        """Return list of supported countries"""
        pass
    
    # Core Payment Operations
    
    @abstractmethod
    async def create_payment_intent(
        self,
        amount: Decimal,
        currency: str = "usd",
        metadata: Optional[Dict[str, Any]] = None,
        customer_id: Optional[str] = None,
        payment_method_types: Optional[List[str]] = None,
        **kwargs
    ) -> PaymentIntent:
        """
        Create a payment intent.
        
        Args:
            amount: Payment amount in the specified currency
            currency: Currency code (default: USD)
            metadata: Additional metadata to attach to the payment
            customer_id: Customer ID if applicable
            payment_method_types: Allowed payment method types
            **kwargs: Gateway-specific parameters
            
        Returns:
            PaymentIntent: Created payment intent
            
        Raises:
            GatewayError: If payment intent creation fails
        """
        pass
    
    @abstractmethod
    async def confirm_payment(
        self,
        payment_intent_id: str,
        payment_method: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> PaymentResult:
        """
        Confirm a payment intent.
        
        Args:
            payment_intent_id: ID of the payment intent to confirm
            payment_method: Payment method details if not already attached
            metadata: Additional metadata
            **kwargs: Gateway-specific parameters
            
        Returns:
            PaymentResult: Result of the payment confirmation
            
        Raises:
            GatewayError: If payment confirmation fails
        """
        pass
    
    @abstractmethod
    async def get_payment(self, payment_id: str) -> PaymentResult:
        """
        Retrieve payment details.
        
        Args:
            payment_id: ID of the payment to retrieve
            
        Returns:
            PaymentResult: Payment details
            
        Raises:
            GatewayError: If payment retrieval fails
        """
        pass
    
    # Refund Operations
    
    @abstractmethod
    async def create_refund(
        self,
        payment_id: str,
        amount: Optional[Decimal] = None,
        reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> RefundResult:
        """
        Create a refund for a payment.
        
        Args:
            payment_id: ID of the payment to refund
            amount: Amount to refund (full refund if None)
            reason: Reason for the refund
            metadata: Additional metadata
            **kwargs: Gateway-specific parameters
            
        Returns:
            RefundResult: Result of the refund creation
            
        Raises:
            GatewayError: If refund creation fails
        """
        pass
    
    @abstractmethod
    async def get_refund(self, refund_id: str) -> RefundResult:
        """
        Retrieve refund details.
        
        Args:
            refund_id: ID of the refund to retrieve
            
        Returns:
            RefundResult: Refund details
            
        Raises:
            GatewayError: If refund retrieval fails
        """
        pass
    
    # Customer Operations
    
    @abstractmethod
    async def create_customer(
        self,
        email: Optional[str] = None,
        name: Optional[str] = None,
        phone: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> CustomerResult:
        """
        Create a customer.
        
        Args:
            email: Customer email
            name: Customer name
            phone: Customer phone
            metadata: Additional metadata
            **kwargs: Gateway-specific parameters
            
        Returns:
            CustomerResult: Created customer details
            
        Raises:
            GatewayError: If customer creation fails
        """
        pass
    
    @abstractmethod
    async def get_customer(self, customer_id: str) -> CustomerResult:
        """
        Retrieve customer details.
        
        Args:
            customer_id: ID of the customer to retrieve
            
        Returns:
            CustomerResult: Customer details
            
        Raises:
            GatewayError: If customer retrieval fails
        """
        pass
    
    # Payout Operations (for marketplaces)
    
    @abstractmethod
    async def create_payout(
        self,
        amount: Decimal,
        destination_account: str,
        currency: str = "usd",
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> PayoutResult:
        """
        Create a payout to a connected account.
        
        Args:
            amount: Payout amount
            destination_account: Account to send payout to
            currency: Currency code
            metadata: Additional metadata
            **kwargs: Gateway-specific parameters
            
        Returns:
            PayoutResult: Result of the payout creation
            
        Raises:
            GatewayError: If payout creation fails
        """
        pass
    
    # Webhook Operations
    
    @abstractmethod
    async def verify_webhook(
        self,
        payload: bytes,
        signature: str,
        secret: str
    ) -> bool:
        """
        Verify webhook signature.
        
        Args:
            payload: Raw webhook payload
            signature: Webhook signature header
            secret: Webhook secret
            
        Returns:
            bool: True if signature is valid
        """
        pass
    
    @abstractmethod
    async def parse_webhook_event(
        self,
        payload: bytes,
        signature: str,
        secret: str
    ) -> WebhookEvent:
        """
        Parse and verify a webhook event.
        
        Args:
            payload: Raw webhook payload
            signature: Webhook signature header
            secret: Webhook secret
            
        Returns:
            WebhookEvent: Parsed webhook event
            
        Raises:
            GatewayError: If webhook verification or parsing fails
        """
        pass
    
    # Health and Utility Methods
    
    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """
        Check gateway health and connectivity.
        
        Returns:
            Dict containing health status and response times
        """
        pass
    
    @abstractmethod
    async def get_supported_features(self) -> Dict[str, bool]:
        """
        Get list of features supported by this gateway.
        
        Returns:
            Dict mapping feature names to support status
        """
        pass
    
    # Helper Methods (can be overridden if needed)
    
    def validate_amount(self, amount: Decimal, currency: str = "usd") -> bool:
        """
        Validate payment amount for the gateway.
        
        Args:
            amount: Amount to validate
            currency: Currency code
            
        Returns:
            bool: True if amount is valid
        """
        if currency.lower() == "usd":
            return Decimal("0.50") <= amount <= Decimal("999999.99")
        return True  # Default validation for other currencies
    
    def format_amount_for_gateway(self, amount: Decimal, currency: str = "usd") -> int:
        """
        Format amount for gateway API (usually convert to cents).
        
        Args:
            amount: Amount to format
            currency: Currency code
            
        Returns:
            int: Amount in smallest currency unit
        """
        if currency.lower() in ["usd", "eur", "gbp", "cad", "aud"]:
            return int(amount * 100)  # Convert to cents
        return int(amount)  # For zero-decimal currencies
    
    def format_amount_from_gateway(self, amount: int, currency: str = "usd") -> Decimal:
        """
        Format amount from gateway API (usually convert from cents).
        
        Args:
            amount: Amount from gateway
            currency: Currency code
            
        Returns:
            Decimal: Amount in major currency unit
        """
        if currency.lower() in ["usd", "eur", "gbp", "cad", "aud"]:
            return Decimal(amount) / 100  # Convert from cents
        return Decimal(amount)  # For zero-decimal currencies