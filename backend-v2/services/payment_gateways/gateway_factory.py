"""
Payment Gateway Factory
Creates and manages payment gateway instances
"""

import logging
from typing import Dict, Any, Optional, Type
from .base_gateway import PaymentGateway, GatewayType, GatewayError

logger = logging.getLogger(__name__)


class GatewayFactory:
    """
    Simplified factory for creating payment gateway instances.
    Compatible with the existing hybrid payment system.
    """
    
    def create_gateway(self, gateway_type: str, config: Dict[str, Any]) -> PaymentGateway:
        """
        Create a payment gateway instance.
        
        Args:
            gateway_type: String type of gateway ('stripe', 'square', etc.)
            config: Configuration for the gateway
            
        Returns:
            PaymentGateway: Configured gateway instance
        """
        gateway_type = gateway_type.lower()
        
        if gateway_type == 'stripe':
            from .stripe_gateway import StripeGateway
            return StripeGateway(config)
        elif gateway_type == 'square':
            from .square_gateway import SquareGateway
            return SquareGateway(config)
        elif gateway_type == 'tilled':
            from .tilled_gateway import TilledGateway
            return TilledGateway(config)
        else:
            raise GatewayError(
                f"Unsupported gateway type: {gateway_type}. "
                f"Supported types: stripe, square, tilled"
            )


class PaymentGatewayFactory:
    """Factory for creating payment gateway instances"""
    
    _gateways: Dict[GatewayType, Type[PaymentGateway]] = {}
    _instances: Dict[str, PaymentGateway] = {}
    
    @classmethod
    def register_gateway(cls, gateway_type: GatewayType, gateway_class: Type[PaymentGateway]):
        """
        Register a gateway implementation.
        
        Args:
            gateway_type: Type of gateway
            gateway_class: Gateway implementation class
        """
        cls._gateways[gateway_type] = gateway_class
        logger.info(f"Registered payment gateway: {gateway_type.value}")
    
    @classmethod
    def create_gateway(
        cls,
        gateway_type: GatewayType,
        config: Dict[str, Any],
        instance_name: Optional[str] = None
    ) -> PaymentGateway:
        """
        Create a payment gateway instance.
        
        Args:
            gateway_type: Type of gateway to create
            config: Configuration for the gateway
            instance_name: Optional name for caching the instance
            
        Returns:
            PaymentGateway: Configured gateway instance
            
        Raises:
            GatewayError: If gateway type is not registered or creation fails
        """
        if gateway_type not in cls._gateways:
            available_gateways = list(cls._gateways.keys())
            raise GatewayError(
                f"Gateway type {gateway_type.value} not registered. "
                f"Available: {[g.value for g in available_gateways]}",
                code="GATEWAY_NOT_REGISTERED",
                gateway_type=gateway_type
            )
        
        # Check if we have a cached instance
        cache_key = instance_name or f"{gateway_type.value}_default"
        if cache_key in cls._instances:
            logger.debug(f"Returning cached gateway instance: {cache_key}")
            return cls._instances[cache_key]
        
        try:
            gateway_class = cls._gateways[gateway_type]
            gateway_instance = gateway_class(config)
            
            # Cache the instance if name provided
            if instance_name:
                cls._instances[cache_key] = gateway_instance
                logger.info(f"Created and cached gateway instance: {cache_key}")
            else:
                logger.info(f"Created gateway instance: {gateway_type.value}")
            
            return gateway_instance
            
        except Exception as e:
            logger.error(f"Failed to create gateway {gateway_type.value}: {str(e)}")
            raise GatewayError(
                f"Failed to create gateway {gateway_type.value}: {str(e)}",
                code="GATEWAY_CREATION_FAILED",
                gateway_type=gateway_type
            ) from e
    
    @classmethod
    def get_available_gateways(cls) -> list[GatewayType]:
        """
        Get list of available gateway types.
        
        Returns:
            List of registered gateway types
        """
        return list(cls._gateways.keys())
    
    @classmethod
    def clear_cache(cls, instance_name: Optional[str] = None):
        """
        Clear cached gateway instances.
        
        Args:
            instance_name: Specific instance to clear, or None for all
        """
        if instance_name:
            if instance_name in cls._instances:
                del cls._instances[instance_name]
                logger.info(f"Cleared cached gateway instance: {instance_name}")
        else:
            cls._instances.clear()
            logger.info("Cleared all cached gateway instances")
    
    @classmethod
    def is_gateway_registered(cls, gateway_type: GatewayType) -> bool:
        """
        Check if a gateway type is registered.
        
        Args:
            gateway_type: Gateway type to check
            
        Returns:
            bool: True if gateway is registered
        """
        return gateway_type in cls._gateways


# Configuration templates for different gateways
GATEWAY_CONFIG_TEMPLATES = {
    GatewayType.STRIPE: {
        "required_fields": ["api_key", "webhook_secret"],
        "optional_fields": ["api_version", "connect_client_id"],
        "default_values": {
            "api_version": "2023-10-16",
            "test_mode": True
        }
    },
    GatewayType.TILLED: {
        "required_fields": ["api_key", "webhook_secret"],
        "optional_fields": ["api_version", "environment"],
        "default_values": {
            "environment": "sandbox",
            "test_mode": True
        }
    },
    GatewayType.SQUARE: {
        "required_fields": ["access_token", "application_id", "location_id"],
        "optional_fields": ["webhook_signature_key", "environment"],
        "default_values": {
            "environment": "sandbox",
            "test_mode": True
        }
    }
}


def validate_gateway_config(gateway_type: GatewayType, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate and normalize gateway configuration.
    
    Args:
        gateway_type: Type of gateway
        config: Configuration to validate
        
    Returns:
        Dict: Validated and normalized configuration
        
    Raises:
        GatewayError: If configuration is invalid
    """
    if gateway_type not in GATEWAY_CONFIG_TEMPLATES:
        raise GatewayError(
            f"No configuration template for gateway type {gateway_type.value}",
            code="NO_CONFIG_TEMPLATE",
            gateway_type=gateway_type
        )
    
    template = GATEWAY_CONFIG_TEMPLATES[gateway_type]
    validated_config = config.copy()
    
    # Check required fields
    missing_fields = []
    for field in template["required_fields"]:
        if field not in config or not config[field]:
            missing_fields.append(field)
    
    if missing_fields:
        raise GatewayError(
            f"Missing required configuration fields for {gateway_type.value}: {missing_fields}",
            code="MISSING_CONFIG_FIELDS",
            gateway_type=gateway_type
        )
    
    # Apply default values
    for field, default_value in template["default_values"].items():
        if field not in validated_config:
            validated_config[field] = default_value
    
    # Add gateway type to config
    validated_config["gateway_type"] = gateway_type
    
    return validated_config


def create_gateway_from_settings(
    gateway_type: GatewayType,
    settings_prefix: str,
    settings_dict: Dict[str, Any]
) -> PaymentGateway:
    """
    Create a gateway from application settings.
    
    Args:
        gateway_type: Type of gateway to create
        settings_prefix: Prefix for settings keys (e.g., "STRIPE_", "TILLED_")
        settings_dict: Dictionary containing all settings
        
    Returns:
        PaymentGateway: Configured gateway instance
        
    Raises:
        GatewayError: If configuration is invalid or creation fails
    """
    # Extract gateway-specific settings
    gateway_config = {}
    for key, value in settings_dict.items():
        if key.startswith(settings_prefix):
            config_key = key[len(settings_prefix):].lower()
            gateway_config[config_key] = value
    
    # Validate configuration
    validated_config = validate_gateway_config(gateway_type, gateway_config)
    
    # Create gateway instance
    return PaymentGatewayFactory.create_gateway(gateway_type, validated_config)