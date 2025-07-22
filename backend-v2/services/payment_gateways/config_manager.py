"""
Payment Gateway Configuration Manager
Manages configuration for multiple payment gateways across environments
"""

import os
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Union
from decimal import Decimal
from enum import Enum

from .base_gateway import GatewayType
from .gateway_selector import SelectionStrategy

logger = logging.getLogger(__name__)


class Environment(Enum):
    """Environment types"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


@dataclass
class GatewayConfig:
    """Configuration for a single payment gateway"""
    gateway_type: GatewayType
    enabled: bool = True
    api_key: str = ""
    webhook_secret: str = ""
    test_mode: bool = True
    priority: int = 1  # Lower number = higher priority
    
    # Environment-specific settings
    environment_overrides: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    
    # Feature flags
    features: Dict[str, bool] = field(default_factory=dict)
    
    # Gateway-specific settings
    extra_config: Dict[str, Any] = field(default_factory=dict)
    
    def get_config_for_environment(self, env: Environment) -> Dict[str, Any]:
        """Get complete configuration for specific environment"""
        config = {
            'gateway_type': self.gateway_type,
            'api_key': self.api_key,
            'webhook_secret': self.webhook_secret,
            'test_mode': self.test_mode,
            'enabled': self.enabled,
            'priority': self.priority,
            **self.extra_config
        }
        
        # Apply environment overrides
        if env.value in self.environment_overrides:
            config.update(self.environment_overrides[env.value])
        
        return config


@dataclass
class PaymentGatewayManagerConfig:
    """Configuration for the payment gateway manager"""
    # Gateway configurations
    gateways: Dict[GatewayType, GatewayConfig] = field(default_factory=dict)
    
    # Manager settings
    default_selection_strategy: SelectionStrategy = SelectionStrategy.LOWEST_COST
    failover_enabled: bool = True
    auto_health_checks: bool = True
    health_check_interval: int = 300  # seconds
    
    # Limits and thresholds
    max_retries: int = 3
    retry_delay: float = 1.0  # seconds
    timeout: float = 30.0  # seconds
    
    # Performance settings
    connection_pool_size: int = 10
    connection_timeout: float = 5.0
    
    # Security settings
    webhook_tolerance: int = 300  # seconds
    
    # Monitoring and alerting
    enable_metrics: bool = True
    enable_alerting: bool = True
    alert_webhook_url: Optional[str] = None
    
    # A/B testing configuration
    ab_test_config: Dict[str, Any] = field(default_factory=dict)


class PaymentGatewayConfigManager:
    """Manages payment gateway configurations across environments"""
    
    def __init__(self, environment: Optional[Environment] = None):
        self.environment = environment or self._detect_environment()
        self.configs: Dict[Environment, PaymentGatewayManagerConfig] = {}
        
        # Load configurations
        self._load_default_configs()
        self._load_environment_configs()
        
        logger.info(f"Initialized payment gateway config manager for {self.environment.value}")
    
    def _detect_environment(self) -> Environment:
        """Auto-detect environment from environment variables"""
        env_name = os.getenv('ENVIRONMENT', 'development').lower()
        
        env_map = {
            'dev': Environment.DEVELOPMENT,
            'development': Environment.DEVELOPMENT,
            'test': Environment.DEVELOPMENT,
            'stage': Environment.STAGING,
            'staging': Environment.STAGING,
            'prod': Environment.PRODUCTION,
            'production': Environment.PRODUCTION
        }
        
        return env_map.get(env_name, Environment.DEVELOPMENT)
    
    def _load_default_configs(self):
        """Load default configurations for all environments"""
        
        # Development configuration
        dev_config = PaymentGatewayManagerConfig(
            gateways={
                GatewayType.STRIPE: GatewayConfig(
                    gateway_type=GatewayType.STRIPE,
                    enabled=True,
                    api_key=os.getenv('STRIPE_SECRET_KEY', ''),
                    webhook_secret=os.getenv('STRIPE_WEBHOOK_SECRET', ''),
                    test_mode=True,
                    priority=1,
                    extra_config={
                        'api_version': '2023-10-16',
                        'connect_client_id': os.getenv('STRIPE_CONNECT_CLIENT_ID', '')
                    }
                ),
                GatewayType.TILLED: GatewayConfig(
                    gateway_type=GatewayType.TILLED,
                    enabled=bool(os.getenv('TILLED_API_KEY')),
                    api_key=os.getenv('TILLED_API_KEY', ''),
                    webhook_secret=os.getenv('TILLED_WEBHOOK_SECRET', ''),
                    test_mode=True,
                    priority=2,
                    extra_config={
                        'environment': 'sandbox',
                        'account_id': os.getenv('TILLED_ACCOUNT_ID', '')
                    }
                )
            },
            default_selection_strategy=SelectionStrategy.LOWEST_COST,
            failover_enabled=True,
            auto_health_checks=True,
            health_check_interval=300,
            enable_metrics=True,
            enable_alerting=False
        )
        
        # Staging configuration
        staging_config = PaymentGatewayManagerConfig(
            gateways={
                GatewayType.STRIPE: GatewayConfig(
                    gateway_type=GatewayType.STRIPE,
                    enabled=True,
                    api_key=os.getenv('STRIPE_SECRET_KEY', ''),
                    webhook_secret=os.getenv('STRIPE_WEBHOOK_SECRET', ''),
                    test_mode=True,
                    priority=1,
                    extra_config={
                        'api_version': '2023-10-16',
                        'connect_client_id': os.getenv('STRIPE_CONNECT_CLIENT_ID', '')
                    }
                ),
                GatewayType.TILLED: GatewayConfig(
                    gateway_type=GatewayType.TILLED,
                    enabled=bool(os.getenv('TILLED_API_KEY')),
                    api_key=os.getenv('TILLED_API_KEY', ''),
                    webhook_secret=os.getenv('TILLED_WEBHOOK_SECRET', ''),
                    test_mode=True,
                    priority=2,
                    extra_config={
                        'environment': 'sandbox',
                        'account_id': os.getenv('TILLED_ACCOUNT_ID', '')
                    }
                )
            },
            default_selection_strategy=SelectionStrategy.A_B_TEST,
            failover_enabled=True,
            auto_health_checks=True,
            health_check_interval=180,
            enable_metrics=True,
            enable_alerting=True,
            ab_test_config={
                'test_name': 'stripe_vs_tilled',
                'test_percentage': 50,  # 50% to each gateway
                'test_start_date': '2024-01-01',
                'test_end_date': '2024-12-31'
            }
        )
        
        # Production configuration
        prod_config = PaymentGatewayManagerConfig(
            gateways={
                GatewayType.STRIPE: GatewayConfig(
                    gateway_type=GatewayType.STRIPE,
                    enabled=True,
                    api_key=os.getenv('STRIPE_SECRET_KEY', ''),
                    webhook_secret=os.getenv('STRIPE_WEBHOOK_SECRET', ''),
                    test_mode=False,
                    priority=2,  # Lower priority in production
                    extra_config={
                        'api_version': '2023-10-16',
                        'connect_client_id': os.getenv('STRIPE_CONNECT_CLIENT_ID', '')
                    }
                ),
                GatewayType.TILLED: GatewayConfig(
                    gateway_type=GatewayType.TILLED,
                    enabled=bool(os.getenv('TILLED_API_KEY')),
                    api_key=os.getenv('TILLED_API_KEY', ''),
                    webhook_secret=os.getenv('TILLED_WEBHOOK_SECRET', ''),
                    test_mode=False,
                    priority=1,  # Higher priority in production (lower fees)
                    extra_config={
                        'environment': 'production',
                        'account_id': os.getenv('TILLED_ACCOUNT_ID', '')
                    }
                )
            },
            default_selection_strategy=SelectionStrategy.LOWEST_COST,
            failover_enabled=True,
            auto_health_checks=True,
            health_check_interval=120,
            enable_metrics=True,
            enable_alerting=True,
            alert_webhook_url=os.getenv('PAYMENT_ALERT_WEBHOOK_URL'),
            ab_test_config={
                'test_name': 'cost_optimization',
                'test_percentage': 80,  # 80% to Tilled, 20% to Stripe
                'primary_gateway': 'tilled',
                'fallback_gateway': 'stripe'
            }
        )
        
        self.configs = {
            Environment.DEVELOPMENT: dev_config,
            Environment.STAGING: staging_config,
            Environment.PRODUCTION: prod_config
        }
    
    def _load_environment_configs(self):
        """Load environment-specific configuration overrides"""
        # This could load from files, databases, or external config services
        # For now, we'll use environment variables
        
        config = self.configs[self.environment]
        
        # Override gateway priorities based on environment variables
        if os.getenv('PREFER_TILLED') == 'true':
            if GatewayType.TILLED in config.gateways:
                config.gateways[GatewayType.TILLED].priority = 1
            if GatewayType.STRIPE in config.gateways:
                config.gateways[GatewayType.STRIPE].priority = 2
        
        # Override selection strategy
        strategy_override = os.getenv('PAYMENT_SELECTION_STRATEGY')
        if strategy_override:
            try:
                config.default_selection_strategy = SelectionStrategy(strategy_override)
            except ValueError:
                logger.warning(f"Invalid selection strategy: {strategy_override}")
        
        # Override failover setting
        if os.getenv('DISABLE_PAYMENT_FAILOVER') == 'true':
            config.failover_enabled = False
        
        # Override health check interval
        health_check_interval = os.getenv('PAYMENT_HEALTH_CHECK_INTERVAL')
        if health_check_interval:
            try:
                config.health_check_interval = int(health_check_interval)
            except ValueError:
                logger.warning(f"Invalid health check interval: {health_check_interval}")
    
    def get_config(self, environment: Optional[Environment] = None) -> PaymentGatewayManagerConfig:
        """Get configuration for specified environment"""
        env = environment or self.environment
        return self.configs.get(env, self.configs[Environment.DEVELOPMENT])
    
    def get_gateway_config(
        self,
        gateway_type: GatewayType,
        environment: Optional[Environment] = None
    ) -> Optional[GatewayConfig]:
        """Get configuration for a specific gateway"""
        config = self.get_config(environment)
        return config.gateways.get(gateway_type)
    
    def get_enabled_gateways(
        self,
        environment: Optional[Environment] = None
    ) -> List[GatewayType]:
        """Get list of enabled gateways for environment"""
        config = self.get_config(environment)
        return [
            gateway_type for gateway_type, gateway_config in config.gateways.items()
            if gateway_config.enabled and gateway_config.api_key
        ]
    
    def get_gateway_priority_order(
        self,
        environment: Optional[Environment] = None
    ) -> List[GatewayType]:
        """Get gateways ordered by priority"""
        config = self.get_config(environment)
        enabled_gateways = [
            (gateway_type, gateway_config) 
            for gateway_type, gateway_config in config.gateways.items()
            if gateway_config.enabled and gateway_config.api_key
        ]
        
        # Sort by priority (lower number = higher priority)
        sorted_gateways = sorted(enabled_gateways, key=lambda x: x[1].priority)
        
        return [gateway_type for gateway_type, _ in sorted_gateways]
    
    def is_gateway_enabled(
        self,
        gateway_type: GatewayType,
        environment: Optional[Environment] = None
    ) -> bool:
        """Check if a gateway is enabled"""
        gateway_config = self.get_gateway_config(gateway_type, environment)
        return gateway_config is not None and gateway_config.enabled and bool(gateway_config.api_key)
    
    def update_gateway_config(
        self,
        gateway_type: GatewayType,
        updates: Dict[str, Any],
        environment: Optional[Environment] = None
    ):
        """Update gateway configuration"""
        env = environment or self.environment
        if env not in self.configs:
            logger.error(f"Environment {env.value} not found")
            return
        
        if gateway_type not in self.configs[env].gateways:
            logger.error(f"Gateway {gateway_type.value} not found in {env.value}")
            return
        
        gateway_config = self.configs[env].gateways[gateway_type]
        
        for key, value in updates.items():
            if hasattr(gateway_config, key):
                setattr(gateway_config, key, value)
            else:
                gateway_config.extra_config[key] = value
        
        logger.info(f"Updated {gateway_type.value} configuration for {env.value}")
    
    def enable_gateway(
        self,
        gateway_type: GatewayType,
        environment: Optional[Environment] = None
    ):
        """Enable a gateway"""
        self.update_gateway_config(gateway_type, {'enabled': True}, environment)
    
    def disable_gateway(
        self,
        gateway_type: GatewayType,
        environment: Optional[Environment] = None
    ):
        """Disable a gateway"""
        self.update_gateway_config(gateway_type, {'enabled': False}, environment)
    
    def set_gateway_priority(
        self,
        gateway_type: GatewayType,
        priority: int,
        environment: Optional[Environment] = None
    ):
        """Set gateway priority"""
        self.update_gateway_config(gateway_type, {'priority': priority}, environment)
    
    def export_config(self, environment: Optional[Environment] = None) -> Dict[str, Any]:
        """Export configuration as dictionary"""
        config = self.get_config(environment)
        
        return {
            'environment': (environment or self.environment).value,
            'gateways': {
                gateway_type.value: {
                    'enabled': gateway_config.enabled,
                    'test_mode': gateway_config.test_mode,
                    'priority': gateway_config.priority,
                    'has_api_key': bool(gateway_config.api_key),
                    'has_webhook_secret': bool(gateway_config.webhook_secret),
                    'extra_config': gateway_config.extra_config
                }
                for gateway_type, gateway_config in config.gateways.items()
            },
            'manager_settings': {
                'default_selection_strategy': config.default_selection_strategy.value,
                'failover_enabled': config.failover_enabled,
                'auto_health_checks': config.auto_health_checks,
                'health_check_interval': config.health_check_interval,
                'enable_metrics': config.enable_metrics,
                'enable_alerting': config.enable_alerting
            },
            'ab_test_config': config.ab_test_config
        }
    
    def validate_config(self, environment: Optional[Environment] = None) -> Dict[str, List[str]]:
        """Validate configuration and return any issues"""
        config = self.get_config(environment)
        issues = {
            'errors': [],
            'warnings': [],
            'info': []
        }
        
        enabled_gateways = self.get_enabled_gateways(environment)
        
        if not enabled_gateways:
            issues['errors'].append("No payment gateways are enabled")
        
        for gateway_type, gateway_config in config.gateways.items():
            if gateway_config.enabled:
                if not gateway_config.api_key:
                    issues['errors'].append(f"{gateway_type.value}: Missing API key")
                
                if not gateway_config.webhook_secret:
                    issues['warnings'].append(f"{gateway_type.value}: Missing webhook secret")
                
                # Validate gateway-specific requirements
                if gateway_type == GatewayType.TILLED:
                    if not gateway_config.extra_config.get('account_id'):
                        issues['warnings'].append(f"{gateway_type.value}: Missing account_id")
        
        if len(enabled_gateways) == 1:
            issues['warnings'].append("Only one gateway enabled - no failover available")
        
        if config.default_selection_strategy == SelectionStrategy.A_B_TEST:
            if not config.ab_test_config:
                issues['errors'].append("A/B test strategy selected but no test config provided")
        
        return issues


# Global config manager instance
_config_manager: Optional[PaymentGatewayConfigManager] = None


def get_config_manager() -> PaymentGatewayConfigManager:
    """Get global configuration manager instance"""
    global _config_manager
    if _config_manager is None:
        _config_manager = PaymentGatewayConfigManager()
    return _config_manager


def reload_config():
    """Reload configuration from environment"""
    global _config_manager
    _config_manager = PaymentGatewayConfigManager()
    logger.info("Reloaded payment gateway configuration")


# Convenience functions
def get_current_config() -> PaymentGatewayManagerConfig:
    """Get configuration for current environment"""
    return get_config_manager().get_config()


def get_enabled_gateways() -> List[GatewayType]:
    """Get enabled gateways for current environment"""
    return get_config_manager().get_enabled_gateways()


def is_gateway_enabled(gateway_type: GatewayType) -> bool:
    """Check if gateway is enabled in current environment"""
    return get_config_manager().is_gateway_enabled(gateway_type)