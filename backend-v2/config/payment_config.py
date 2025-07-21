"""
Payment Configuration for BookedBarber V2

This module provides environment-aware payment configuration settings
for the advanced payment rate limiting system.
"""

import os
from dataclasses import dataclass
from decimal import Decimal
from typing import Dict, Any, Optional
from config import settings


@dataclass
class PaymentLimits:
    """Payment amount and transaction limits"""
    min_payment_amount: Decimal
    max_payment_amount: Decimal
    daily_transaction_limit: Decimal
    max_transactions_per_hour: int


@dataclass
class SecuritySettings:
    """Payment security configuration"""
    enable_fraud_detection: bool
    enable_risk_assessment: bool  
    enable_velocity_checking: bool
    require_cvv_verification: bool
    enable_3d_secure: bool
    enable_ip_geolocation_check: bool


@dataclass
class FeatureFlags:
    """Payment feature flags"""
    gift_certificates: bool
    installment_payments: bool
    subscriptions: bool
    automatic_refunds: bool
    partial_refunds: bool
    tips: bool
    loyalty_points: bool


@dataclass
class IntegrationSettings:
    """Integration configuration"""
    platform_fee_percent: Decimal
    stripe_api_version: str


@dataclass
class PaymentEnvironmentConfig:
    """Complete payment configuration for an environment"""
    environment: str
    testing_mode: bool
    debug_logging: bool
    limits: PaymentLimits
    security: SecuritySettings
    features: FeatureFlags
    integrations: IntegrationSettings
    stripe_api_version: str = "2023-10-16"
    custom_metadata: Dict[str, str] = None
    
    def __post_init__(self):
        if self.custom_metadata is None:
            self.custom_metadata = {}
    
    def get_stripe_config(self) -> Dict[str, Any]:
        """Get Stripe-specific configuration"""
        return {
            "api_version": self.stripe_api_version,
            "webhook_tolerance": 300,  # 5 minutes
        }


def get_payment_config() -> PaymentEnvironmentConfig:
    """
    Get payment configuration based on current environment.
    """
    # Determine environment from settings
    environment = getattr(settings, 'environment', 'development')
    
    if environment == "production":
        return PaymentEnvironmentConfig(
            environment="production",
            testing_mode=False,
            debug_logging=False,
            limits=PaymentLimits(
                min_payment_amount=Decimal("5.00"),
                max_payment_amount=Decimal("5000.00"),
                daily_transaction_limit=Decimal("50000.00"),
                max_transactions_per_hour=20
            ),
            security=SecuritySettings(
                enable_fraud_detection=True,
                enable_risk_assessment=True,
                enable_velocity_checking=True,
                require_cvv_verification=True,
                enable_3d_secure=True,
                enable_ip_geolocation_check=True
            ),
            features=FeatureFlags(
                gift_certificates=True,
                installment_payments=True,
                subscriptions=True,
                automatic_refunds=False,  # Disabled in production for manual review
                partial_refunds=True,
                tips=True,
                loyalty_points=True
            ),
            integrations=IntegrationSettings(
                platform_fee_percent=Decimal("2.9"),
                stripe_api_version="2023-10-16"
            )
        )
    
    elif environment == "staging":
        return PaymentEnvironmentConfig(
            environment="staging",
            testing_mode=True,
            debug_logging=True,
            limits=PaymentLimits(
                min_payment_amount=Decimal("1.00"),
                max_payment_amount=Decimal("10000.00"),
                daily_transaction_limit=Decimal("100000.00"),
                max_transactions_per_hour=50
            ),
            security=SecuritySettings(
                enable_fraud_detection=True,
                enable_risk_assessment=True,
                enable_velocity_checking=True,
                require_cvv_verification=False,
                enable_3d_secure=False,
                enable_ip_geolocation_check=False
            ),
            features=FeatureFlags(
                gift_certificates=True,
                installment_payments=True,
                subscriptions=True,
                automatic_refunds=True,
                partial_refunds=True,
                tips=True,
                loyalty_points=True
            ),
            integrations=IntegrationSettings(
                platform_fee_percent=Decimal("0.0"),  # No fees in staging
                stripe_api_version="2023-10-16"
            )
        )
    
    else:  # development
        return PaymentEnvironmentConfig(
            environment="development",
            testing_mode=True,
            debug_logging=True,
            limits=PaymentLimits(
                min_payment_amount=Decimal("0.50"),
                max_payment_amount=Decimal("50000.00"),
                daily_transaction_limit=Decimal("500000.00"),
                max_transactions_per_hour=200
            ),
            security=SecuritySettings(
                enable_fraud_detection=False,
                enable_risk_assessment=False,
                enable_velocity_checking=False,
                require_cvv_verification=False,
                enable_3d_secure=False,
                enable_ip_geolocation_check=False
            ),
            features=FeatureFlags(
                gift_certificates=True,
                installment_payments=True,
                subscriptions=True,
                automatic_refunds=True,
                partial_refunds=True,
                tips=True,
                loyalty_points=True
            ),
            integrations=IntegrationSettings(
                platform_fee_percent=Decimal("0.0"),  # No fees in development
                stripe_api_version="2023-10-16"
            )
        )


# Helper functions for backward compatibility

def is_feature_enabled(feature_name: str) -> bool:
    """Check if a payment feature is enabled in the current environment"""
    config = get_payment_config()
    return getattr(config.features, feature_name, False)


def get_payment_limit(limit_name: str) -> Decimal:
    """Get a payment limit value for the current environment"""
    config = get_payment_config()
    if hasattr(config.limits, limit_name):
        return getattr(config.limits, limit_name)
    
    # Provide sensible defaults for unknown limits
    defaults = {
        "max_refund_amount": config.limits.max_payment_amount,
        "max_payout_amount": config.limits.max_payment_amount * 10,
    }
    return defaults.get(limit_name, Decimal("1000.00"))


def get_security_setting(setting_name: str) -> bool:
    """Get a security setting for the current environment"""
    config = get_payment_config()
    return getattr(config.security, setting_name, False)