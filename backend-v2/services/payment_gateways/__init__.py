"""
Payment Gateway Abstraction Layer
Supports multiple payment processors (Stripe, Tilled.com, etc.)
"""

from .base_gateway import (
    PaymentGateway,
    PaymentIntent,
    PaymentResult,
    RefundResult,
    PayoutResult,
    CustomerResult,
    WebhookEvent,
    GatewayError,
    GatewayType
)

from .gateway_factory import PaymentGatewayFactory
from .gateway_selector import GatewaySelector
from .gateway_manager import PaymentGatewayManager

__all__ = [
    'PaymentGateway',
    'PaymentIntent',
    'PaymentResult',
    'RefundResult',
    'PayoutResult',
    'CustomerResult',
    'WebhookEvent',
    'GatewayError',
    'GatewayType',
    'PaymentGatewayFactory',
    'GatewaySelector',
    'PaymentGatewayManager'
]