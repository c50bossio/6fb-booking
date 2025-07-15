"""
DataDog APM Configuration for BookedBarber V2
=============================================

Enterprise Application Performance Monitoring (APM) configuration
for comprehensive observability and performance tracking at scale.
"""

import os
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json


class DataDogAPMConfig:
    """DataDog APM configuration for production monitoring"""
    
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "production")
        self.service_name = os.getenv("DD_SERVICE", "bookedbarber-api")
        self.version = os.getenv("DD_VERSION", "2.3.0")
        self.cluster_name = os.getenv("DD_CLUSTER_NAME", "production")
        
    def configure_apm(self):
        """Configure DataDog APM with enterprise settings"""
        
        # Core APM settings
        apm_config = {
            "DD_TRACE_ENABLED": "true",
            "DD_PROFILING_ENABLED": "true",
            "DD_LOGS_INJECTION": "true",
            "DD_TRACE_ANALYTICS_ENABLED": "true",
            
            # Service identification
            "DD_SERVICE": self.service_name,
            "DD_ENV": self.environment,
            "DD_VERSION": self.version,
            "DD_CLUSTER_NAME": self.cluster_name,
            
            # Sampling configuration (optimized for high traffic)
            "DD_TRACE_SAMPLE_RATE": os.getenv("DD_TRACE_SAMPLE_RATE", "0.1"),  # 10%
            "DD_PROFILING_UPLOAD_PERIOD": "60",  # Upload every 60 seconds
            "DD_TRACE_RATE_LIMIT": "100",  # Max 100 traces per second
            
            # Performance settings
            "DD_TRACE_STARTUP_LOGS": "false",
            "DD_TRACE_DEBUG": "false",
            "DD_CALL_BASIC_CONFIG": "false",
            
            # Integration settings
            "DD_INTEGRATION_FASTAPI_ENABLED": "true",
            "DD_INTEGRATION_SQLALCHEMY_ENABLED": "true",
            "DD_INTEGRATION_REDIS_ENABLED": "true",
            "DD_INTEGRATION_HTTPX_ENABLED": "true",
            "DD_INTEGRATION_ASYNCIO_ENABLED": "true",
            
            # Custom tags
            "DD_TAGS": self._get_global_tags(),
            
            # Log correlation
            "DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL": "false",
            "DD_LOGS_CONFIG_AUTO_MULTI_LINE_DETECTION": "true",
            
            # Agent configuration
            "DD_AGENT_HOST": os.getenv("DD_AGENT_HOST", "localhost"),
            "DD_DOGSTATSD_PORT": os.getenv("DD_DOGSTATSD_PORT", "8125"),
            "DD_TRACE_AGENT_PORT": os.getenv("DD_TRACE_AGENT_PORT", "8126"),
        }
        
        # Set environment variables
        for key, value in apm_config.items():
            if not os.getenv(key):
                os.environ[key] = str(value)
        
        # Initialize DataDog tracer
        self._initialize_tracer()
        
        # Configure custom metrics
        self._configure_custom_metrics()
        
        # Set up span decorators
        self._setup_span_decorators()
        
        logging.info("DataDog APM configured for production monitoring")
    
    def _get_global_tags(self) -> str:
        """Get global tags for all traces and metrics"""
        tags = [
            f"service:{self.service_name}",
            f"env:{self.environment}",
            f"version:{self.version}",
            f"cluster:{self.cluster_name}",
            f"region:{os.getenv('AWS_REGION', 'us-east-1')}",
            f"deployment_time:{os.getenv('DEPLOYMENT_TIME', 'unknown')}",
        ]
        
        # Add custom business tags
        if os.getenv("BUSINESS_TIER"):
            tags.append(f"business_tier:{os.getenv('BUSINESS_TIER')}")
        
        if os.getenv("FEATURE_FLAGS"):
            tags.append(f"feature_flags:{os.getenv('FEATURE_FLAGS')}")
        
        return ",".join(tags)
    
    def _initialize_tracer(self):
        """Initialize DataDog tracer with custom configuration"""
        try:
            from ddtrace import tracer, config
            from ddtrace.profiling import Profiler
            
            # Configure tracer
            tracer.configure(
                hostname=os.getenv("DD_AGENT_HOST", "localhost"),
                port=int(os.getenv("DD_TRACE_AGENT_PORT", "8126")),
                https=False,
                priority_sampling=True,
            )
            
            # Configure integrations
            config.fastapi["service_name"] = f"{self.service_name}-web"
            config.fastapi["analytics_enabled"] = True
            config.fastapi["analytics_sample_rate"] = 1.0
            
            config.sqlalchemy["service_name"] = f"{self.service_name}-db"
            config.sqlalchemy["analytics_enabled"] = True
            
            config.redis["service_name"] = f"{self.service_name}-cache"
            config.redis["analytics_enabled"] = True
            
            # Start profiler
            profiler = Profiler(
                env=self.environment,
                service=self.service_name,
                version=self.version,
            )
            profiler.start()
            
            logging.info("DataDog tracer and profiler initialized")
            
        except ImportError:
            logging.error("DataDog tracer not available - install ddtrace library")
        except Exception as e:
            logging.error(f"Failed to initialize DataDog tracer: {e}")
    
    def _configure_custom_metrics(self):
        """Configure custom business and technical metrics"""
        try:
            from datadog import initialize, statsd
            
            # Initialize DataDog client
            initialize(
                api_key=os.getenv("DD_API_KEY"),
                app_key=os.getenv("DD_APP_KEY"),
                host_name=os.getenv("DD_HOSTNAME"),
            )
            
            # Set up custom metrics
            self.metrics = DataDogMetrics(statsd)
            
            logging.info("DataDog custom metrics configured")
            
        except ImportError:
            logging.error("DataDog client not available - install datadog library")
        except Exception as e:
            logging.error(f"Failed to configure custom metrics: {e}")
    
    def _setup_span_decorators(self):
        """Set up custom span decorators for business logic"""
        try:
            from ddtrace import tracer
            
            def business_operation(operation_name: str, resource: str = None):
                """Decorator for business operations"""
                def decorator(func):
                    def wrapper(*args, **kwargs):
                        with tracer.trace(
                            name=operation_name,
                            service=f"{self.service_name}-business",
                            resource=resource or func.__name__,
                        ) as span:
                            span.set_tag("operation.type", "business")
                            span.set_tag("operation.name", operation_name)
                            
                            try:
                                result = func(*args, **kwargs)
                                span.set_tag("operation.success", "true")
                                return result
                            except Exception as e:
                                span.set_tag("operation.success", "false")
                                span.set_tag("error.message", str(e))
                                span.set_tag("error.type", type(e).__name__)
                                raise
                    
                    return wrapper
                return decorator
            
            def payment_operation(payment_provider: str = "stripe"):
                """Decorator for payment operations"""
                def decorator(func):
                    def wrapper(*args, **kwargs):
                        with tracer.trace(
                            name="payment.operation",
                            service=f"{self.service_name}-payments",
                            resource=func.__name__,
                        ) as span:
                            span.set_tag("payment.provider", payment_provider)
                            span.set_tag("operation.type", "payment")
                            
                            try:
                                result = func(*args, **kwargs)
                                span.set_tag("payment.success", "true")
                                return result
                            except Exception as e:
                                span.set_tag("payment.success", "false")
                                span.set_tag("payment.error", str(e))
                                raise
                    
                    return wrapper
                return decorator
            
            # Make decorators available globally
            import builtins
            builtins.dd_business_operation = business_operation
            builtins.dd_payment_operation = payment_operation
            
        except ImportError:
            logging.error("DataDog tracer not available for decorators")


class DataDogMetrics:
    """Custom DataDog metrics for business and technical monitoring"""
    
    def __init__(self, statsd_client):
        self.statsd = statsd_client
        self.service_name = os.getenv("DD_SERVICE", "bookedbarber-api")
    
    def business_metrics(self):
        """Business-specific metrics tracking"""
        return {
            # Booking metrics
            "bookings.created": self._create_counter("bookings.created"),
            "bookings.cancelled": self._create_counter("bookings.cancelled"),
            "bookings.completed": self._create_counter("bookings.completed"),
            "bookings.no_show": self._create_counter("bookings.no_show"),
            
            # Revenue metrics
            "revenue.total": self._create_gauge("revenue.total"),
            "revenue.daily": self._create_gauge("revenue.daily"),
            "revenue.per_booking": self._create_histogram("revenue.per_booking"),
            
            # User metrics
            "users.registered": self._create_counter("users.registered"),
            "users.active_daily": self._create_gauge("users.active_daily"),
            "users.active_monthly": self._create_gauge("users.active_monthly"),
            "users.retention_rate": self._create_gauge("users.retention_rate"),
            
            # Payment metrics
            "payments.processed": self._create_counter("payments.processed"),
            "payments.failed": self._create_counter("payments.failed"),
            "payments.refunded": self._create_counter("payments.refunded"),
            "payments.processing_time": self._create_histogram("payments.processing_time"),
            
            # Notification metrics
            "notifications.email_sent": self._create_counter("notifications.email_sent"),
            "notifications.sms_sent": self._create_counter("notifications.sms_sent"),
            "notifications.failed": self._create_counter("notifications.failed"),
        }
    
    def technical_metrics(self):
        """Technical performance metrics"""
        return {
            # API metrics
            "api.requests_total": self._create_counter("api.requests_total"),
            "api.response_time": self._create_histogram("api.response_time"),
            "api.error_rate": self._create_gauge("api.error_rate"),
            "api.throughput": self._create_gauge("api.throughput"),
            
            # Database metrics
            "database.connections_active": self._create_gauge("database.connections_active"),
            "database.query_time": self._create_histogram("database.query_time"),
            "database.slow_queries": self._create_counter("database.slow_queries"),
            "database.deadlocks": self._create_counter("database.deadlocks"),
            
            # Cache metrics
            "cache.hits": self._create_counter("cache.hits"),
            "cache.misses": self._create_counter("cache.misses"),
            "cache.hit_rate": self._create_gauge("cache.hit_rate"),
            "cache.memory_usage": self._create_gauge("cache.memory_usage"),
            
            # Background job metrics
            "jobs.queued": self._create_gauge("jobs.queued"),
            "jobs.processing": self._create_gauge("jobs.processing"),
            "jobs.completed": self._create_counter("jobs.completed"),
            "jobs.failed": self._create_counter("jobs.failed"),
            "jobs.processing_time": self._create_histogram("jobs.processing_time"),
            
            # System metrics
            "system.cpu_usage": self._create_gauge("system.cpu_usage"),
            "system.memory_usage": self._create_gauge("system.memory_usage"),
            "system.disk_usage": self._create_gauge("system.disk_usage"),
            "system.load_average": self._create_gauge("system.load_average"),
        }
    
    def _create_counter(self, metric_name: str):
        """Create a counter metric"""
        def counter(value: int = 1, tags: List[str] = None):
            self.statsd.increment(
                f"{self.service_name}.{metric_name}",
                value=value,
                tags=tags or [],
            )
        return counter
    
    def _create_gauge(self, metric_name: str):
        """Create a gauge metric"""
        def gauge(value: float, tags: List[str] = None):
            self.statsd.gauge(
                f"{self.service_name}.{metric_name}",
                value=value,
                tags=tags or [],
            )
        return gauge
    
    def _create_histogram(self, metric_name: str):
        """Create a histogram metric"""
        def histogram(value: float, tags: List[str] = None):
            self.statsd.histogram(
                f"{self.service_name}.{metric_name}",
                value=value,
                tags=tags or [],
            )
        return histogram


class DataDogDashboards:
    """DataDog dashboard configurations"""
    
    @staticmethod
    def get_overview_dashboard() -> Dict[str, Any]:
        """Main overview dashboard configuration"""
        return {
            "title": "BookedBarber V2 - Production Overview",
            "description": "High-level view of system health and business metrics",
            "layout_type": "ordered",
            "widgets": [
                {
                    "definition": {
                        "type": "timeseries",
                        "title": "API Request Rate",
                        "requests": [
                            {
                                "q": "sum:bookedbarber-api.api.requests_total{*}.as_rate()",
                                "display_type": "line",
                            }
                        ],
                    }
                },
                {
                    "definition": {
                        "type": "query_value",
                        "title": "Error Rate",
                        "requests": [
                            {
                                "q": "sum:bookedbarber-api.api.error_rate{*}",
                                "aggregator": "avg",
                            }
                        ],
                        "custom_links": [
                            {
                                "label": "View Errors in Sentry",
                                "link": "https://sentry.io/organizations/bookedbarber/issues/",
                            }
                        ],
                    }
                },
                {
                    "definition": {
                        "type": "timeseries",
                        "title": "Database Performance",
                        "requests": [
                            {
                                "q": "avg:bookedbarber-api.database.query_time{*}",
                                "display_type": "line",
                            }
                        ],
                    }
                },
                {
                    "definition": {
                        "type": "toplist",
                        "title": "Slowest Endpoints",
                        "requests": [
                            {
                                "q": "top(avg:trace.fastapi.request.duration{*} by {resource_name}, 10, 'mean', 'desc')",
                            }
                        ],
                    }
                },
            ],
        }
    
    @staticmethod
    def get_business_dashboard() -> Dict[str, Any]:
        """Business metrics dashboard configuration"""
        return {
            "title": "BookedBarber V2 - Business Metrics",
            "description": "Key business performance indicators and metrics",
            "layout_type": "ordered",
            "widgets": [
                {
                    "definition": {
                        "type": "query_value",
                        "title": "Daily Revenue",
                        "requests": [
                            {
                                "q": "sum:bookedbarber-api.revenue.daily{*}",
                                "aggregator": "avg",
                            }
                        ],
                    }
                },
                {
                    "definition": {
                        "type": "timeseries",
                        "title": "Booking Volume",
                        "requests": [
                            {
                                "q": "sum:bookedbarber-api.bookings.created{*}.as_rate()",
                                "display_type": "bars",
                            }
                        ],
                    }
                },
                {
                    "definition": {
                        "type": "query_value",
                        "title": "Active Users (24h)",
                        "requests": [
                            {
                                "q": "sum:bookedbarber-api.users.active_daily{*}",
                                "aggregator": "avg",
                            }
                        ],
                    }
                },
                {
                    "definition": {
                        "type": "timeseries",
                        "title": "Payment Success Rate",
                        "requests": [
                            {
                                "q": "sum:bookedbarber-api.payments.processed{*}.as_rate() / (sum:bookedbarber-api.payments.processed{*}.as_rate() + sum:bookedbarber-api.payments.failed{*}.as_rate()) * 100",
                                "display_type": "line",
                            }
                        ],
                    }
                },
            ],
        }


# Global configuration instance
datadog_apm = DataDogAPMConfig()

# Convenience functions
def initialize_datadog_apm():
    """Initialize DataDog APM for production"""
    datadog_apm.configure_apm()

def get_business_metrics():
    """Get business metrics instance"""
    if hasattr(datadog_apm, 'metrics'):
        return datadog_apm.metrics.business_metrics()
    return {}

def get_technical_metrics():
    """Get technical metrics instance"""
    if hasattr(datadog_apm, 'metrics'):
        return datadog_apm.metrics.technical_metrics()
    return {}