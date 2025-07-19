"""
Production Configuration for Agent System
Integrates error handling, authentication, database pooling, and monitoring
"""

import os
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional

from utils.agent_error_handler import AgentErrorHandler, RetryConfig, RetryStrategy, CircuitBreakerConfig
from utils.agent_auth import AgentAuthenticator, AgentRole
from utils.database_pool import PoolConfiguration, initialize_database_pool
from utils.agent_health_monitor import start_agent_monitoring, health_monitor


class ProductionConfig:
    """Centralized production configuration for agent system"""
    
    def __init__(self, config_file: Optional[str] = None):
        self.logger = logging.getLogger("production_config")
        self.config_data = {}
        self.config_file = config_file or "production_config.json"
        
        # Load configuration
        self._load_config()
        
        # Initialize systems
        self.error_handler: Optional[AgentErrorHandler] = None
        self.authenticator: Optional[AgentAuthenticator] = None
        self.database_pool = None
        
        # Setup logging
        self._configure_logging()
    
    def _load_config(self):
        """Load configuration from file with defaults"""
        default_config = {
            "environment": "production",
            "debug": False,
            
            # Database configuration
            "database": {
                "path": "bookedbarber_production.db",
                "pool": {
                    "min_connections": 10,
                    "max_connections": 50,
                    "connection_timeout_seconds": 30,
                    "idle_timeout_seconds": 300,
                    "max_connection_age_seconds": 3600,
                    "health_check_interval_seconds": 60,
                    "enable_metrics": True,
                    "enable_query_logging": False
                }
            },
            
            # Error handling configuration
            "error_handling": {
                "circuit_breakers": {
                    "database": {
                        "failure_threshold": 5,
                        "recovery_timeout": 60,
                        "success_threshold": 3
                    },
                    "openai_api": {
                        "failure_threshold": 10,
                        "recovery_timeout": 120,
                        "success_threshold": 5
                    },
                    "email_service": {
                        "failure_threshold": 3,
                        "recovery_timeout": 30,
                        "success_threshold": 2
                    },
                    "sms_service": {
                        "failure_threshold": 3,
                        "recovery_timeout": 30,
                        "success_threshold": 2
                    }
                },
                "retry_configs": {
                    "agent_conversation": {
                        "strategy": "exponential",
                        "max_attempts": 3,
                        "base_delay": 1.0,
                        "max_delay": 60.0,
                        "backoff_multiplier": 2.0,
                        "jitter": True
                    },
                    "database_operation": {
                        "strategy": "exponential",
                        "max_attempts": 5,
                        "base_delay": 0.5,
                        "max_delay": 30.0,
                        "backoff_multiplier": 2.0,
                        "jitter": True
                    },
                    "external_api": {
                        "strategy": "exponential",
                        "max_attempts": 3,
                        "base_delay": 2.0,
                        "max_delay": 120.0,
                        "backoff_multiplier": 2.0,
                        "jitter": True
                    }
                }
            },
            
            # Authentication configuration
            "authentication": {
                "secret_key": None,  # Will be generated if not provided
                "token_expiry_hours": 24,
                "max_sessions_per_agent": 5,
                "enable_ip_restrictions": True,
                "enable_rate_limiting": True,
                "default_rate_limit_per_hour": 1000
            },
            
            # Monitoring configuration
            "monitoring": {
                "enabled": True,
                "interval_seconds": 60,
                "health_checks": {
                    "database_connectivity": {
                        "enabled": True,
                        "interval_seconds": 60,
                        "timeout_seconds": 10
                    },
                    "error_handler_status": {
                        "enabled": True,
                        "interval_seconds": 120,
                        "timeout_seconds": 15
                    },
                    "agent_response_times": {
                        "enabled": True,
                        "interval_seconds": 300,
                        "timeout_seconds": 20
                    }
                },
                "alerting": {
                    "enabled": True,
                    "email_notifications": False,
                    "slack_notifications": False,
                    "webhook_url": None
                }
            },
            
            # Agent system configuration
            "agent_system": {
                "max_concurrent_conversations": 100,
                "conversation_timeout_minutes": 30,
                "enable_conversation_logging": True,
                "enable_performance_metrics": True,
                "default_agent_roles": [
                    {
                        "agent_id": "conversation_agent_001",
                        "role": "conversation_agent",
                        "rate_limit": 2000
                    },
                    {
                        "agent_id": "analytics_agent_001", 
                        "role": "analytics_agent",
                        "rate_limit": 500
                    },
                    {
                        "agent_id": "support_agent_001",
                        "role": "support_agent",
                        "rate_limit": 1000
                    }
                ]
            },
            
            # Logging configuration
            "logging": {
                "level": "INFO",
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                "file_logging": {
                    "enabled": True,
                    "file_path": "logs/agent_system.log",
                    "max_file_size_mb": 100,
                    "backup_count": 5,
                    "rotation": "time"
                },
                "structured_logging": {
                    "enabled": True,
                    "format": "json"
                }
            }
        }
        
        # Try to load from file
        config_path = Path(self.config_file)
        if config_path.exists():
            try:
                with open(config_path, 'r') as f:
                    file_config = json.load(f)
                
                # Deep merge with defaults
                self.config_data = self._deep_merge(default_config, file_config)
                self.logger.info(f"Loaded configuration from {config_path}")
                
            except Exception as e:
                self.logger.error(f"Failed to load config from {config_path}: {e}")
                self.config_data = default_config
        else:
            self.config_data = default_config
            self.logger.info("Using default configuration")
            
            # Save default config for reference
            try:
                config_path.parent.mkdir(parents=True, exist_ok=True)
                with open(config_path, 'w') as f:
                    json.dump(default_config, f, indent=2, default=str)
                self.logger.info(f"Saved default configuration to {config_path}")
            except Exception as e:
                self.logger.warning(f"Could not save default config: {e}")
    
    def _deep_merge(self, base: Dict, update: Dict) -> Dict:
        """Deep merge two dictionaries"""
        result = base.copy()
        
        for key, value in update.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        
        return result
    
    def _configure_logging(self):
        """Configure production logging"""
        log_config = self.config_data.get("logging", {})
        
        # Set log level
        log_level = getattr(logging, log_config.get("level", "INFO").upper())
        
        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(log_level)
        
        # Clear existing handlers
        for handler in root_logger.handlers[:]:
            root_logger.removeHandler(handler)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(log_level)
        
        # Formatter
        log_format = log_config.get("format", "%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        formatter = logging.Formatter(log_format)
        console_handler.setFormatter(formatter)
        
        root_logger.addHandler(console_handler)
        
        # File logging
        file_config = log_config.get("file_logging", {})
        if file_config.get("enabled", True):
            try:
                from logging.handlers import RotatingFileHandler
                
                log_file = file_config.get("file_path", "logs/agent_system.log")
                log_file_path = Path(log_file)
                log_file_path.parent.mkdir(parents=True, exist_ok=True)
                
                max_size = file_config.get("max_file_size_mb", 100) * 1024 * 1024
                backup_count = file_config.get("backup_count", 5)
                
                file_handler = RotatingFileHandler(
                    log_file_path,
                    maxBytes=max_size,
                    backupCount=backup_count
                )
                
                file_handler.setLevel(log_level)
                file_handler.setFormatter(formatter)
                
                root_logger.addHandler(file_handler)
                
            except Exception as e:
                self.logger.error(f"Failed to setup file logging: {e}")
    
    def initialize_systems(self) -> Dict[str, Any]:
        """Initialize all production systems"""
        initialization_results = {
            "error_handler": False,
            "authenticator": False,
            "database_pool": False,
            "health_monitor": False,
            "default_agents": False
        }
        
        try:
            # Initialize error handling
            self.error_handler = self._initialize_error_handler()
            initialization_results["error_handler"] = True
            self.logger.info("Error handler initialized")
            
            # Initialize authentication
            self.authenticator = self._initialize_authenticator()
            initialization_results["authenticator"] = True
            self.logger.info("Authentication system initialized")
            
            # Initialize database pool
            self.database_pool = self._initialize_database_pool()
            initialization_results["database_pool"] = True
            self.logger.info("Database pool initialized")
            
            # Initialize health monitoring
            if self.config_data.get("monitoring", {}).get("enabled", True):
                self._initialize_health_monitoring()
                initialization_results["health_monitor"] = True
                self.logger.info("Health monitoring initialized")
            
            # Create default agent credentials
            self._create_default_agents()
            initialization_results["default_agents"] = True
            self.logger.info("Default agent credentials created")
            
            self.logger.info("Production systems initialization complete")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize production systems: {e}")
            raise
        
        return initialization_results
    
    def _initialize_error_handler(self) -> AgentErrorHandler:
        """Initialize error handling system"""
        error_config = self.config_data.get("error_handling", {})
        
        # Create error handler with configuration
        handler = AgentErrorHandler()
        
        # Configure circuit breakers
        cb_configs = error_config.get("circuit_breakers", {})
        for name, config in cb_configs.items():
            from utils.agent_error_handler import CircuitBreaker
            circuit_breaker_config = CircuitBreakerConfig(**config)
            handler.circuit_breakers[name] = CircuitBreaker(name, circuit_breaker_config)
        
        # Configure retry policies
        retry_configs = error_config.get("retry_configs", {})
        for operation, config in retry_configs.items():
            # Convert strategy string to enum
            strategy_str = config.pop("strategy", "exponential")
            config["strategy"] = RetryStrategy(strategy_str)
            
            handler.retry_configs[operation] = RetryConfig(**config)
        
        return handler
    
    def _initialize_authenticator(self) -> AgentAuthenticator:
        """Initialize authentication system"""
        auth_config = self.config_data.get("authentication", {})
        
        # Get or generate secret key
        secret_key = auth_config.get("secret_key")
        if not secret_key:
            import secrets
            secret_key = secrets.token_urlsafe(64)
            self.logger.warning("Generated new authentication credential - consider setting in config for persistence")
        
        # Create authenticator
        authenticator = AgentAuthenticator(
            secret_key=secret_key,
            token_expiry_hours=auth_config.get("token_expiry_hours", 24)
        )
        
        return authenticator
    
    def _initialize_database_pool(self) -> Any:
        """Initialize database connection pool"""
        db_config = self.config_data.get("database", {})
        pool_config_data = db_config.get("pool", {})
        
        # Create pool configuration
        pool_config = PoolConfiguration(
            database_path=db_config.get("path", "bookedbarber_production.db"),
            **pool_config_data
        )
        
        # Add circuit breaker config for database
        if "database" in self.config_data.get("error_handling", {}).get("circuit_breakers", {}):
            cb_config_data = self.config_data["error_handling"]["circuit_breakers"]["database"]
            pool_config.circuit_breaker_config = CircuitBreakerConfig(**cb_config_data)
        
        # Initialize global pool
        return initialize_database_pool(pool_config)
    
    def _initialize_health_monitoring(self):
        """Initialize health monitoring system"""
        monitoring_config = self.config_data.get("monitoring", {})
        
        # Configure health checks
        health_checks = monitoring_config.get("health_checks", {})
        for check_name, check_config in health_checks.items():
            if check_config.get("enabled", True):
                health_monitor.register_health_check(
                    name=check_name,
                    check_function=getattr(health_monitor, f"_check_{check_name}", lambda: True),
                    interval_seconds=check_config.get("interval_seconds", 60),
                    timeout_seconds=check_config.get("timeout_seconds", 30)
                )
        
        # Start monitoring
        start_agent_monitoring()
    
    def _create_default_agents(self):
        """Create default agent credentials"""
        if not self.authenticator:
            raise RuntimeError("Authenticator not initialized")
        
        agent_config = self.config_data.get("agent_system", {})
        default_agents = agent_config.get("default_agent_roles", [])
        
        for agent_config in default_agents:
            try:
                agent_id = agent_config["agent_id"]
                role = AgentRole(agent_config["role"])
                rate_limit = agent_config.get("rate_limit", 1000)
                
                # Check if agent already exists
                try:
                    # This will raise an exception if agent doesn't exist
                    self.authenticator.create_agent_credentials(
                        agent_id=agent_id,
                        role=role,
                        rate_limit_per_hour=rate_limit
                    )
                    self.logger.info(f"Created default agent: {agent_id}")
                    
                except Exception as e:
                    if "already exists" in str(e):
                        self.logger.debug(f"Agent {agent_id} already exists")
                    else:
                        self.logger.error(f"Failed to create agent {agent_id}: {e}")
                        
            except Exception as e:
                self.logger.error(f"Failed to process agent config {agent_config}: {e}")
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        status = {
            "environment": self.config_data.get("environment", "unknown"),
            "timestamp": datetime.now().isoformat(),
            "systems": {}
        }
        
        # Error handler status
        if self.error_handler:
            try:
                status["systems"]["error_handler"] = self.error_handler.get_health_status()
            except Exception as e:
                status["systems"]["error_handler"] = {"error": str(e)}
        
        # Database pool status
        if self.database_pool:
            try:
                status["systems"]["database_pool"] = self.database_pool.get_pool_status()
            except Exception as e:
                status["systems"]["database_pool"] = {"error": str(e)}
        
        # Authentication status
        if self.authenticator:
            try:
                status["systems"]["authentication"] = self.authenticator.get_auth_stats()
            except Exception as e:
                status["systems"]["authentication"] = {"error": str(e)}
        
        # Health monitoring status
        try:
            from utils.agent_health_monitor import get_agent_health
            status["systems"]["health_monitor"] = get_agent_health()
        except Exception as e:
            status["systems"]["health_monitor"] = {"error": str(e)}
        
        return status
    
    def shutdown(self):
        """Gracefully shutdown all systems"""
        self.logger.info("Shutting down production systems")
        
        try:
            # Stop health monitoring
            from utils.agent_health_monitor import stop_agent_monitoring
            stop_agent_monitoring()
            
            # Shutdown database pool
            if self.database_pool:
                self.database_pool.shutdown()
            
            self.logger.info("Production systems shutdown complete")
            
        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}")


# Global production configuration instance
_production_config: Optional[ProductionConfig] = None


def get_production_config() -> ProductionConfig:
    """Get the global production configuration instance"""
    global _production_config
    
    if _production_config is None:
        _production_config = ProductionConfig()
        _production_config.initialize_systems()
    
    return _production_config


def initialize_production_environment(config_file: Optional[str] = None) -> ProductionConfig:
    """Initialize the production environment"""
    global _production_config
    
    _production_config = ProductionConfig(config_file)
    initialization_results = _production_config.initialize_systems()
    
    # Log initialization results
    logger = logging.getLogger("production_init")
    logger.info("Production environment initialization results:")
    for system, success in initialization_results.items():
        status = "✓" if success else "✗"
        logger.info(f"  {status} {system}")
    
    return _production_config


def shutdown_production_environment():
    """Shutdown the production environment"""
    global _production_config
    
    if _production_config:
        _production_config.shutdown()
        _production_config = None