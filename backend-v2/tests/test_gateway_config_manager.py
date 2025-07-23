"""
Tests for Payment Gateway Configuration Manager
"""

import pytest
import os
from unittest.mock import patch, Mock
from decimal import Decimal

from services.payment_gateways.config_manager import (
    PaymentGatewayConfigManager, GatewayConfig, PaymentGatewayManagerConfig,
    Environment, get_config_manager, reload_config
)
from services.payment_gateways.base_gateway import GatewayType
from services.payment_gateways.gateway_selector import SelectionStrategy


class TestGatewayConfig:
    """Test GatewayConfig dataclass"""
    
    def test_gateway_config_initialization(self):
        """Test basic gateway config initialization"""
        config = GatewayConfig(
            gateway_type=GatewayType.STRIPE,
            api_key="sk_test_123",
            webhook_secret="whsec_test",
            enabled=True,
            test_mode=True
        )
        
        assert config.gateway_type == GatewayType.STRIPE
        assert config.api_key == "sk_test_123"
        assert config.enabled
        assert config.test_mode
        assert config.priority == 1  # Default priority
    
    def test_get_config_for_environment(self):
        """Test environment-specific config generation"""
        config = GatewayConfig(
            gateway_type=GatewayType.STRIPE,
            api_key="sk_test_123",
            webhook_secret="whsec_test",
            environment_overrides={
                'production': {
                    'api_key': 'sk_live_456',
                    'test_mode': False
                }
            }
        )
        
        # Development config
        dev_config = config.get_config_for_environment(Environment.DEVELOPMENT)
        assert dev_config['api_key'] == "sk_test_123"
        assert dev_config['test_mode'] is True
        
        # Production config with overrides
        prod_config = config.get_config_for_environment(Environment.PRODUCTION)
        assert prod_config['api_key'] == "sk_live_456"
        assert prod_config['test_mode'] is False


class TestPaymentGatewayConfigManager:
    """Test PaymentGatewayConfigManager"""
    
    @pytest.fixture
    def config_manager(self):
        """Create config manager for testing"""
        with patch.dict(os.environ, {
            'ENVIRONMENT': 'development',
            'STRIPE_SECRET_KEY': 'sk_test_stripe',
            'STRIPE_WEBHOOK_SECRET': 'whsec_stripe',
            'TILLED_API_KEY': 'tld_test_123',
            'TILLED_WEBHOOK_SECRET': 'whsec_tilled'
        }):
            return PaymentGatewayConfigManager()
    
    def test_environment_detection(self):
        """Test automatic environment detection"""
        with patch.dict(os.environ, {'ENVIRONMENT': 'production'}):
            manager = PaymentGatewayConfigManager()
            assert manager.environment == Environment.PRODUCTION
        
        with patch.dict(os.environ, {'ENVIRONMENT': 'staging'}):
            manager = PaymentGatewayConfigManager()
            assert manager.environment == Environment.STAGING
        
        with patch.dict(os.environ, {'ENVIRONMENT': 'dev'}):
            manager = PaymentGatewayConfigManager()
            assert manager.environment == Environment.DEVELOPMENT
        
        # Test default fallback
        with patch.dict(os.environ, {}, clear=True):
            manager = PaymentGatewayConfigManager()
            assert manager.environment == Environment.DEVELOPMENT
    
    def test_get_config(self, config_manager):
        """Test getting configuration for environment"""
        config = config_manager.get_config()
        
        assert isinstance(config, PaymentGatewayManagerConfig)
        assert GatewayType.STRIPE in config.gateways
        assert config.default_selection_strategy == SelectionStrategy.LOWEST_COST
        assert config.failover_enabled
    
    def test_get_gateway_config(self, config_manager):
        """Test getting specific gateway configuration"""
        stripe_config = config_manager.get_gateway_config(GatewayType.STRIPE)
        
        assert isinstance(stripe_config, GatewayConfig)
        assert stripe_config.gateway_type == GatewayType.STRIPE
        assert stripe_config.api_key == "sk_test_stripe"
        assert stripe_config.enabled
    
    def test_get_enabled_gateways(self, config_manager):
        """Test getting list of enabled gateways"""
        enabled = config_manager.get_enabled_gateways()
        
        assert isinstance(enabled, list)
        assert GatewayType.STRIPE in enabled
        # Tilled should be enabled if API key is set
        assert GatewayType.TILLED in enabled
    
    def test_gateway_priority_order(self, config_manager):
        """Test getting gateways in priority order"""
        priority_order = config_manager.get_gateway_priority_order()
        
        assert isinstance(priority_order, list)
        assert len(priority_order) >= 1
        
        # First gateway should have highest priority (lowest number)
        first_gateway = priority_order[0]
        first_config = config_manager.get_gateway_config(first_gateway)
        
        for gateway in priority_order[1:]:
            gateway_config = config_manager.get_gateway_config(gateway)
            assert gateway_config.priority >= first_config.priority
    
    def test_is_gateway_enabled(self, config_manager):
        """Test checking if gateway is enabled"""
        assert config_manager.is_gateway_enabled(GatewayType.STRIPE)
        
        # Test with non-existent gateway
        with patch.object(config_manager, 'get_gateway_config', return_value=None):
            assert not config_manager.is_gateway_enabled(GatewayType.STRIPE)
    
    def test_update_gateway_config(self, config_manager):
        """Test updating gateway configuration"""
        # Update Stripe priority
        config_manager.update_gateway_config(
            GatewayType.STRIPE,
            {'priority': 5}
        )
        
        stripe_config = config_manager.get_gateway_config(GatewayType.STRIPE)
        assert stripe_config.priority == 5
        
        # Update with extra config
        config_manager.update_gateway_config(
            GatewayType.STRIPE,
            {'custom_setting': 'test_value'}
        )
        
        stripe_config = config_manager.get_gateway_config(GatewayType.STRIPE)
        assert stripe_config.extra_config['custom_setting'] == 'test_value'
    
    def test_enable_disable_gateway(self, config_manager):
        """Test enabling and disabling gateways"""
        # Disable Stripe
        config_manager.disable_gateway(GatewayType.STRIPE)
        assert not config_manager.is_gateway_enabled(GatewayType.STRIPE)
        
        # Re-enable Stripe
        config_manager.enable_gateway(GatewayType.STRIPE)
        assert config_manager.is_gateway_enabled(GatewayType.STRIPE)
    
    def test_set_gateway_priority(self, config_manager):
        """Test setting gateway priority"""
        config_manager.set_gateway_priority(GatewayType.STRIPE, 10)
        
        stripe_config = config_manager.get_gateway_config(GatewayType.STRIPE)
        assert stripe_config.priority == 10
    
    def test_export_config(self, config_manager):
        """Test exporting configuration"""
        exported = config_manager.export_config()
        
        assert isinstance(exported, dict)
        assert 'environment' in exported
        assert 'gateways' in exported
        assert 'manager_settings' in exported
        
        # Check gateway info (should not expose secrets)
        stripe_info = exported['gateways']['stripe']
        assert 'has_api_key' in stripe_info
        assert 'api_key' not in stripe_info  # Should not expose actual key
        assert stripe_info['has_api_key'] is True
    
    def test_validate_config(self, config_manager):
        """Test configuration validation"""
        issues = config_manager.validate_config()
        
        assert isinstance(issues, dict)
        assert 'errors' in issues
        assert 'warnings' in issues
        assert 'info' in issues
        
        # Should not have errors with valid config
        assert len(issues['errors']) == 0
    
    def test_validate_config_with_issues(self):
        """Test configuration validation with issues"""
        with patch.dict(os.environ, {'STRIPE_SECRET_KEY': ''}, clear=True):
            manager = PaymentGatewayConfigManager()
            issues = manager.validate_config()
            
            # Should have errors for missing API keys
            assert len(issues['errors']) > 0
            assert any("Missing API key" in error for error in issues['errors'])
    
    def test_environment_overrides(self):
        """Test environment-specific configuration overrides"""
        with patch.dict(os.environ, {
            'PREFER_TILLED': 'true',
            'PAYMENT_SELECTION_STRATEGY': 'highest_success_rate',
            'DISABLE_PAYMENT_FAILOVER': 'true',
            'PAYMENT_HEALTH_CHECK_INTERVAL': '60'
        }):
            manager = PaymentGatewayConfigManager()
            config = manager.get_config()
            
            # Check Tilled has higher priority (lower number)
            tilled_config = config.gateways.get(GatewayType.TILLED)
            stripe_config = config.gateways.get(GatewayType.STRIPE)
            
            if tilled_config and stripe_config:
                assert tilled_config.priority < stripe_config.priority
            
            # Check strategy override
            assert config.default_selection_strategy == SelectionStrategy.HIGHEST_SUCCESS_RATE
            
            # Check failover disabled
            assert not config.failover_enabled
            
            # Check health check interval
            assert config.health_check_interval == 60
    
    def test_production_vs_development_differences(self):
        """Test differences between production and development configs"""
        # Development config
        with patch.dict(os.environ, {'ENVIRONMENT': 'development'}):
            dev_manager = PaymentGatewayConfigManager()
            dev_config = dev_manager.get_config()
        
        # Production config
        with patch.dict(os.environ, {'ENVIRONMENT': 'production'}):
            prod_manager = PaymentGatewayConfigManager()
            prod_config = prod_manager.get_config()
        
        # Test mode should be different
        dev_stripe = dev_config.gateways.get(GatewayType.STRIPE)
        prod_stripe = prod_config.gateways.get(GatewayType.STRIPE)
        
        if dev_stripe and prod_stripe:
            assert dev_stripe.test_mode is True
            assert prod_stripe.test_mode is False
        
        # Production should have different health check intervals
        assert prod_config.health_check_interval <= dev_config.health_check_interval
        
        # Production should have alerting enabled
        assert prod_config.enable_alerting is True


class TestGlobalConfigManager:
    """Test global config manager functions"""
    
    def test_get_config_manager_singleton(self):
        """Test global config manager is singleton"""
        manager1 = get_config_manager()
        manager2 = get_config_manager()
        
        assert manager1 is manager2
    
    def test_reload_config(self):
        """Test config reloading"""
        manager1 = get_config_manager()
        reload_config()
        manager2 = get_config_manager()
        
        assert manager1 is not manager2  # New instance after reload
    
    @patch('services.payment_gateways.config_manager.get_config_manager')
    def test_convenience_functions(self, mock_get_manager):
        """Test convenience functions"""
        mock_manager = Mock()
        mock_manager.get_config.return_value = Mock()
        mock_manager.get_enabled_gateways.return_value = [GatewayType.STRIPE]
        mock_manager.is_gateway_enabled.return_value = True
        mock_get_manager.return_value = mock_manager
        
        from services.payment_gateways.config_manager import (
            get_current_config, get_enabled_gateways, is_gateway_enabled
        )
        
        # Test functions call the manager correctly
        config = get_current_config()
        mock_manager.get_config.assert_called_once()
        
        gateways = get_enabled_gateways()
        mock_manager.get_enabled_gateways.assert_called_once()
        assert gateways == [GatewayType.STRIPE]
        
        enabled = is_gateway_enabled(GatewayType.STRIPE)
        mock_manager.is_gateway_enabled.assert_called_once_with(GatewayType.STRIPE)
        assert enabled is True


class TestEnvironmentSpecificConfigs:
    """Test environment-specific configuration behaviors"""
    
    def test_staging_ab_test_config(self):
        """Test staging environment A/B test configuration"""
        with patch.dict(os.environ, {'ENVIRONMENT': 'staging'}):
            manager = PaymentGatewayConfigManager()
            config = manager.get_config()
            
            assert config.default_selection_strategy == SelectionStrategy.A_B_TEST
            assert 'ab_test_config' in config.__dict__
            assert config.ab_test_config.get('test_name') == 'stripe_vs_tilled'
    
    def test_production_cost_optimization(self):
        """Test production cost optimization settings"""
        with patch.dict(os.environ, {'ENVIRONMENT': 'production'}):
            manager = PaymentGatewayConfigManager()
            config = manager.get_config()
            
            # In production, Tilled should have higher priority (lower number)
            tilled_config = config.gateways.get(GatewayType.TILLED)
            stripe_config = config.gateways.get(GatewayType.STRIPE)
            
            if tilled_config and stripe_config:
                assert tilled_config.priority < stripe_config.priority
            
            # Should have alerting enabled
            assert config.enable_alerting is True
    
    def test_development_relaxed_settings(self):
        """Test development environment has relaxed settings"""
        with patch.dict(os.environ, {'ENVIRONMENT': 'development'}):
            manager = PaymentGatewayConfigManager()
            config = manager.get_config()
            
            # Development should not have alerting enabled by default
            assert config.enable_alerting is False
            
            # Should have longer health check intervals
            assert config.health_check_interval >= 300


class TestConfigValidation:
    """Test configuration validation scenarios"""
    
    def test_valid_config_no_issues(self):
        """Test that valid config produces no validation issues"""
        with patch.dict(os.environ, {
            'STRIPE_SECRET_KEY': 'sk_test_valid',
            'STRIPE_WEBHOOK_SECRET': 'whsec_valid',
            'TILLED_API_KEY': 'tld_valid',
            'TILLED_WEBHOOK_SECRET': 'whsec_tilled_valid'
        }):
            manager = PaymentGatewayConfigManager()
            issues = manager.validate_config()
            
            assert len(issues['errors']) == 0
    
    def test_missing_api_keys(self):
        """Test validation with missing API keys"""
        with patch.dict(os.environ, {}, clear=True):
            manager = PaymentGatewayConfigManager()
            issues = manager.validate_config()
            
            # Should have errors for missing API keys
            assert len(issues['errors']) > 0
            assert any("Missing API key" in error for error in issues['errors'])
    
    def test_missing_webhook_secrets(self):
        """Test validation with missing webhook secrets"""
        with patch.dict(os.environ, {
            'STRIPE_SECRET_KEY': 'sk_test_valid',
            'TILLED_API_KEY': 'tld_valid'
            # Missing webhook secrets
        }):
            manager = PaymentGatewayConfigManager()
            issues = manager.validate_config()
            
            # Should have warnings for missing webhook secrets
            assert len(issues['warnings']) > 0
            assert any("Missing webhook secret" in warning for warning in issues['warnings'])
    
    def test_single_gateway_warning(self):
        """Test warning when only one gateway is enabled"""
        with patch.dict(os.environ, {
            'STRIPE_SECRET_KEY': 'sk_test_valid',
            # No Tilled config
        }):
            manager = PaymentGatewayConfigManager()
            issues = manager.validate_config()
            
            # Should warn about lack of failover
            assert any("Only one gateway enabled" in warning for warning in issues['warnings'])
    
    def test_ab_test_without_config(self):
        """Test A/B test strategy without proper config"""
        with patch.dict(os.environ, {
            'STRIPE_SECRET_KEY': 'sk_test_valid',
            'PAYMENT_SELECTION_STRATEGY': 'a_b_test'
        }):
            manager = PaymentGatewayConfigManager()
            
            # Manually set empty ab_test_config to simulate missing config
            config = manager.get_config()
            config.ab_test_config = {}
            
            issues = manager.validate_config()
            
            # Should have error about missing A/B test config
            assert any("A/B test strategy" in error for error in issues['errors'])


if __name__ == "__main__":
    pytest.main([__file__, "-v"])