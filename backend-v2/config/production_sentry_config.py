"""
Production-Grade Sentry Configuration for BookedBarber V2
Enterprise error monitoring with business intelligence integration
"""

import os
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlAlchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.httpx import HttpxIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from typing import Dict, Any, Optional
import logging

from utils.logger import get_logger

logger = get_logger(__name__)

class ProductionSentryConfig:
    """Production-grade Sentry configuration with business intelligence"""
    
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.dsn = os.getenv("SENTRY_DSN")
        self.release = os.getenv("SENTRY_RELEASE", "bookedbarber-v2.0.0")
        self.traces_sample_rate = float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1"))
        self.profiles_sample_rate = float(os.getenv("SENTRY_PROFILES_SAMPLE_RATE", "0.1"))
        
        # Business context configuration
        self.business_tags = {
            "business_model": "six_figure_barber",
            "industry": "beauty_services",
            "user_base": "small_business_owners"
        }
    
    def configure_sentry(self) -> bool:
        """Configure Sentry for production monitoring"""
        try:
            if not self.dsn:
                logger.warning("SENTRY_DSN not configured - error tracking disabled")
                return False
            
            # Initialize Sentry with comprehensive integrations
            sentry_sdk.init(
                dsn=self.dsn,
                environment=self.environment,
                release=self.release,
                
                # Performance monitoring
                traces_sample_rate=self.traces_sample_rate,
                profiles_sample_rate=self.profiles_sample_rate,
                
                # Integrations for comprehensive coverage
                integrations=[
                    FastApiIntegration(auto_enabling_integrations=False),
                    SqlAlchemyIntegration(),
                    RedisIntegration(),
                    HttpxIntegration(),
                    LoggingIntegration(
                        level=logging.INFO,
                        event_level=logging.ERROR
                    ),
                ],
                
                # Business context tags
                default_tags=self.business_tags,
                
                # Advanced configuration
                send_default_pii=False,  # Privacy compliance
                before_send=self.before_send_filter,
                before_send_transaction=self.before_send_transaction_filter,
                
                # Performance tuning
                max_breadcrumbs=50,
                attach_stacktrace=True,
                
                # Business intelligence
                release=self.release,
                server_name=f"bookedbarber-{self.environment}"
            )
            
            # Set business context
            self._set_business_context()
            
            logger.info(f"Sentry configured for {self.environment} environment")
            return True
            
        except Exception as e:
            logger.error(f"Failed to configure Sentry: {str(e)}")
            return False
    
    def before_send_filter(self, event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Filter and enhance events before sending to Sentry"""
        try:
            # Skip health check and monitoring endpoint errors
            if self._is_monitoring_endpoint(event):
                return None
            
            # Add business context
            event = self._add_business_context(event)
            
            # Add revenue impact analysis
            event = self._add_revenue_impact(event)
            
            # Sanitize sensitive data
            event = self._sanitize_sensitive_data(event)
            
            return event
            
        except Exception as e:
            logger.error(f"Error in Sentry before_send filter: {str(e)}")
            return event
    
    def before_send_transaction_filter(self, event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Filter performance transactions before sending"""
        try:
            # Skip low-value transactions
            if self._is_low_value_transaction(event):
                return None
                
            # Add business performance context
            event = self._add_performance_context(event)
            
            return event
            
        except Exception as e:
            logger.error(f"Error in Sentry transaction filter: {str(e)}")
            return event
    
    def _set_business_context(self):
        """Set business-specific context for all events"""
        sentry_sdk.set_context("business", {
            "methodology": "Six Figure Barber",
            "platform": "BookedBarber V2",
            "version": self.release,
            "environment": self.environment,
            "business_type": "B2B SaaS",
            "target_market": "Independent Barbers & Shop Owners"
        })
        
        # Set financial context
        sentry_sdk.set_context("financial", {
            "revenue_model": "subscription_plus_transaction",
            "avg_booking_value": 85.00,
            "commission_rate": 2.9,
            "target_arpu": 250.00
        })
    
    def _add_business_context(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Add business context to error events"""
        try:
            # Add business impact classification
            error_message = event.get("message", "")
            exception_type = ""
            
            if "exception" in event and event["exception"]["values"]:
                exception_type = event["exception"]["values"][0].get("type", "")
            
            # Classify business impact
            business_impact = self._classify_business_impact(error_message, exception_type)
            
            # Add custom tags
            event.setdefault("tags", {}).update({
                "business_impact": business_impact,
                "customer_facing": self._is_customer_facing_error(event),
                "revenue_risk": self._assess_revenue_risk(event),
                "user_experience_impact": self._assess_ux_impact(event)
            })
            
            # Add extra context
            event.setdefault("extra", {}).update({
                "business_methodology": "Six Figure Barber",
                "error_classification_version": "v2.0"
            })
            
            return event
            
        except Exception as e:
            logger.error(f"Failed to add business context: {str(e)}")
            return event
    
    def _add_revenue_impact(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Add revenue impact analysis to error events"""
        try:
            # Estimate potential revenue impact
            impact_level = event.get("tags", {}).get("business_impact", "low")
            
            revenue_impact = {
                "critical": {"min": 100, "max": 1000, "probability": 0.8},
                "high": {"min": 50, "max": 200, "probability": 0.6},
                "medium": {"min": 10, "max": 50, "probability": 0.4},
                "low": {"min": 0, "max": 10, "probability": 0.2}
            }
            
            impact_data = revenue_impact.get(impact_level, revenue_impact["low"])
            
            event.setdefault("extra", {}).update({
                "revenue_impact_estimate": {
                    "min_loss": impact_data["min"],
                    "max_loss": impact_data["max"],
                    "probability": impact_data["probability"],
                    "impact_level": impact_level
                }
            })
            
            return event
            
        except Exception as e:
            logger.error(f"Failed to add revenue impact: {str(e)}")
            return event
    
    def _add_performance_context(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Add performance context to transaction events"""
        try:
            transaction_name = event.get("transaction", "")
            
            # Add business performance context
            event.setdefault("tags", {}).update({
                "business_critical": self._is_business_critical_transaction(transaction_name),
                "revenue_generating": self._is_revenue_generating_transaction(transaction_name),
                "user_journey_stage": self._get_user_journey_stage(transaction_name)
            })
            
            return event
            
        except Exception as e:
            logger.error(f"Failed to add performance context: {str(e)}")
            return event
    
    def _sanitize_sensitive_data(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive data from events"""
        try:
            # Define sensitive fields to scrub
            sensitive_fields = [
                'password', 'credit_card', 'ssn', 'bank_account',
                'stripe_key', 'api_key', 'secret', 'token',
                'phone_number', 'email', 'address'
            ]
            
            # Recursively scrub sensitive data
            def scrub_dict(data):
                if isinstance(data, dict):
                    for key, value in data.items():
                        if any(sensitive in key.lower() for sensitive in sensitive_fields):
                            data[key] = "[Redacted]"
                        elif isinstance(value, (dict, list)):
                            scrub_dict(value)
                elif isinstance(data, list):
                    for item in data:
                        scrub_dict(item)
            
            scrub_dict(event)
            return event
            
        except Exception as e:
            logger.error(f"Failed to sanitize sensitive data: {str(e)}")
            return event
    
    def _is_monitoring_endpoint(self, event: Dict[str, Any]) -> bool:
        """Check if error is from monitoring/health endpoints"""
        request_info = event.get("request", {})
        url = request_info.get("url", "")
        
        monitoring_paths = ["/health", "/metrics", "/ping", "/status"]
        return any(path in url for path in monitoring_paths)
    
    def _is_low_value_transaction(self, event: Dict[str, Any]) -> bool:
        """Determine if transaction is low-value for monitoring"""
        transaction_name = event.get("transaction", "")
        
        # Skip static asset and health check transactions
        low_value_patterns = [
            "/static/", "/_next/", "/favicon.ico",
            "/health", "/ping", "/metrics"
        ]
        
        return any(pattern in transaction_name for pattern in low_value_patterns)
    
    def _classify_business_impact(self, error_message: str, exception_type: str) -> str:
        """Classify error based on business impact"""
        error_text = f"{error_message} {exception_type}".lower()
        
        # Critical business impact
        if any(keyword in error_text for keyword in [
            "payment", "stripe", "transaction", "billing",
            "booking", "appointment", "revenue"
        ]):
            return "critical"
        
        # High business impact
        if any(keyword in error_text for keyword in [
            "authentication", "login", "user", "client",
            "database", "connection"
        ]):
            return "high"
        
        # Medium business impact
        if any(keyword in error_text for keyword in [
            "email", "notification", "calendar", "sync"
        ]):
            return "medium"
        
        return "low"
    
    def _is_customer_facing_error(self, event: Dict[str, Any]) -> bool:
        """Determine if error affects customer experience"""
        request_info = event.get("request", {})
        url = request_info.get("url", "")
        
        # Customer-facing endpoints
        customer_paths = ["/booking", "/appointment", "/payment", "/profile"]
        return any(path in url for path in customer_paths)
    
    def _assess_revenue_risk(self, event: Dict[str, Any]) -> str:
        """Assess revenue risk level"""
        business_impact = event.get("tags", {}).get("business_impact", "low")
        customer_facing = self._is_customer_facing_error(event)
        
        if business_impact == "critical" and customer_facing:
            return "high"
        elif business_impact in ["critical", "high"]:
            return "medium"
        else:
            return "low"
    
    def _assess_ux_impact(self, event: Dict[str, Any]) -> str:
        """Assess user experience impact"""
        if self._is_customer_facing_error(event):
            business_impact = event.get("tags", {}).get("business_impact", "low")
            return "high" if business_impact in ["critical", "high"] else "medium"
        return "low"
    
    def _is_business_critical_transaction(self, transaction_name: str) -> bool:
        """Determine if transaction is business critical"""
        critical_patterns = [
            "/api/v2/bookings", "/api/v2/payments",
            "/api/v2/auth", "/api/v2/users"
        ]
        return any(pattern in transaction_name for pattern in critical_patterns)
    
    def _is_revenue_generating_transaction(self, transaction_name: str) -> bool:
        """Determine if transaction directly generates revenue"""
        revenue_patterns = [
            "/api/v2/bookings/create", "/api/v2/payments/process",
            "/api/v2/subscriptions", "/api/v2/stripe"
        ]
        return any(pattern in transaction_name for pattern in revenue_patterns)
    
    def _get_user_journey_stage(self, transaction_name: str) -> str:
        """Determine user journey stage"""
        if "/auth/" in transaction_name:
            return "authentication"
        elif "/booking" in transaction_name:
            return "booking_flow"
        elif "/payment" in transaction_name:
            return "payment_flow"
        elif "/profile" in transaction_name:
            return "account_management"
        else:
            return "general_usage"

# Global production Sentry configuration
production_sentry = ProductionSentryConfig()

def initialize_production_sentry() -> bool:
    """Initialize Sentry for production environment"""
    return production_sentry.configure_sentry()