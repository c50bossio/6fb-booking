"""
API Integration Improvements Implementation Guide

This module provides comprehensive improvements for all third-party API integrations
in BookedBarber V2, focusing on reliability, security, and performance.
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session

from services.enhanced_webhook_security import EnhancedWebhookSecurity
from services.enterprise_api_reliability import EnterpriseAPIReliability, APIProvider
from services.circuit_breaker_service import CircuitBreakerService
from services.api_reliability_service import APIReliabilityService

logger = logging.getLogger(__name__)


class APIIntegrationImprovements:
    """
    Comprehensive API integration improvements that can be applied to existing services.
    
    This class demonstrates how to enhance your existing API integrations with:
    1. Enterprise-grade reliability patterns
    2. Advanced webhook security
    3. Circuit breaker protection
    4. Intelligent retry strategies
    5. Performance monitoring
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.webhook_security = EnhancedWebhookSecurity(db)
        self.reliability = EnterpriseAPIReliability(db)
        self.circuit_breaker = CircuitBreakerService()
        self.api_reliability = APIReliabilityService()
    
    # ========================================
    # STRIPE INTEGRATION IMPROVEMENTS
    # ========================================
    
    async def enhance_stripe_operations(self, existing_stripe_service):
        """
        Enhance existing Stripe service with reliability patterns.
        
        Apply this pattern to your existing stripe_service.py:
        """
        
        # Example: Enhanced customer creation
        async def create_customer_enhanced(user, organization, payment_method_id=None):
            """Enhanced Stripe customer creation with reliability"""
            
            # Wrap existing logic with circuit breaker
            circuit_key = "stripe_create_customer"
            if not self.circuit_breaker.can_execute(circuit_key):
                raise Exception("Stripe customer creation circuit breaker is open")
            
            try:
                # Use enterprise reliability wrapper
                response = await self.reliability.execute_with_reliability(
                    provider=APIProvider.STRIPE,
                    operation_name="create_customer",
                    api_call=existing_stripe_service.create_stripe_customer,
                    user,
                    organization
                )
                
                if response.success:
                    self.circuit_breaker.record_success(circuit_key)
                    logger.info(f"Stripe customer created successfully in {response.response_time:.2f}s")
                    return response.data
                else:
                    self.circuit_breaker.record_failure(circuit_key)
                    raise Exception(f"Stripe customer creation failed: {response.error}")
                    
            except Exception as e:
                self.circuit_breaker.record_failure(circuit_key)
                logger.error(f"Stripe customer creation error: {e}")
                raise
        
        return create_customer_enhanced
    
    async def enhance_stripe_webhooks(self):
        """
        Enhanced Stripe webhook processing with security validation.
        
        Apply this to your existing webhook handlers:
        """
        
        async def process_stripe_webhook_enhanced(payload: bytes, signature: str, source_ip: str):
            """Enhanced Stripe webhook processing"""
            
            # Comprehensive security validation
            validation_result = self.webhook_security.validate_webhook_comprehensive(
                provider="stripe",
                payload=payload,
                signature=signature,
                source_ip=source_ip,
                webhook_secret="your_stripe_webhook_secret"
            )
            
            if not validation_result.is_valid:
                logger.warning(f"Stripe webhook validation failed: {validation_result.error_message}")
                return {"error": "Invalid webhook", "security_score": validation_result.security_score}
            
            # Check for suspicious activity
            if validation_result.security_score < 0.5:
                logger.warning(f"Suspicious Stripe webhook detected: {validation_result.security_score}")
                # Could implement additional verification or rate limiting here
            
            # Process webhook with circuit breaker protection
            circuit_key = f"stripe_webhook_{validation_result.event_type}"
            if self.circuit_breaker.can_execute(circuit_key):
                try:
                    # Your existing webhook processing logic here
                    result = await self._process_stripe_event(validation_result.event_type, payload)
                    self.circuit_breaker.record_success(circuit_key)
                    return result
                except Exception as e:
                    self.circuit_breaker.record_failure(circuit_key)
                    logger.error(f"Stripe webhook processing failed: {e}")
                    raise
            else:
                logger.warning(f"Stripe webhook circuit breaker open for {validation_result.event_type}")
                return {"error": "Service temporarily unavailable"}
        
        return process_stripe_webhook_enhanced
    
    # ========================================
    # TWILIO INTEGRATION IMPROVEMENTS
    # ========================================
    
    async def enhance_twilio_operations(self):
        """
        Enhanced Twilio SMS operations with reliability patterns.
        """
        
        async def send_sms_enhanced(to_number: str, message: str, **kwargs):
            """Enhanced SMS sending with reliability"""
            
            # Use bulk operation for multiple SMS
            if isinstance(to_number, list):
                sms_data = [
                    {"to": number, "body": message, **kwargs}
                    for number in to_number
                ]
                
                bulk_result = await self.reliability.execute_bulk_operation(
                    provider=APIProvider.TWILIO,
                    operation_name="send_sms",
                    items=sms_data,
                    api_call=self._send_single_sms
                )
                
                return {
                    "success": bulk_result.success_rate > 0.9,
                    "total_sent": bulk_result.successful_items,
                    "failed": bulk_result.failed_items,
                    "success_rate": bulk_result.success_rate,
                    "errors": bulk_result.errors[:5]  # Limit error details
                }
            else:
                # Single SMS with reliability wrapper
                response = await self.reliability.execute_with_reliability(
                    provider=APIProvider.TWILIO,
                    operation_name="send_sms",
                    api_call=self._send_single_sms,
                    {"to": to_number, "body": message, **kwargs}
                )
                
                return {
                    "success": response.success,
                    "message_sid": response.data.get("sid") if response.success else None,
                    "error": response.error,
                    "response_time": response.response_time
                }
        
        return send_sms_enhanced
    
    async def enhance_twilio_webhooks(self):
        """
        Enhanced Twilio webhook processing.
        """
        
        async def process_twilio_webhook_enhanced(form_data: Dict, signature: str, webhook_url: str, source_ip: str):
            """Enhanced Twilio webhook processing"""
            
            # Validate webhook with enhanced security
            validation_result = self.webhook_security.validate_webhook_comprehensive(
                provider="twilio",
                payload=None,  # Twilio uses form data
                signature=signature,
                source_ip=source_ip,
                webhook_secret="your_twilio_auth_token",
                webhook_url=webhook_url,
                form_data=form_data
            )
            
            if not validation_result.is_valid:
                return {"error": "Invalid Twilio webhook"}
            
            # Process with reliability patterns
            try:
                result = await self._process_twilio_event(form_data)
                return {"success": True, "result": result}
            except Exception as e:
                logger.error(f"Twilio webhook processing failed: {e}")
                return {"error": str(e)}
        
        return process_twilio_webhook_enhanced
    
    # ========================================
    # SENDGRID INTEGRATION IMPROVEMENTS
    # ========================================
    
    async def enhance_sendgrid_operations(self):
        """
        Enhanced SendGrid email operations.
        """
        
        async def send_bulk_emails_enhanced(email_data: List[Dict]):
            """Enhanced bulk email sending"""
            
            bulk_result = await self.reliability.execute_bulk_operation(
                provider=APIProvider.SENDGRID,
                operation_name="send_email",
                items=email_data,
                api_call=self._send_single_email
            )
            
            # Log comprehensive results
            logger.info(
                f"SendGrid bulk email completed - "
                f"Total: {bulk_result.total_items}, "
                f"Success Rate: {bulk_result.success_rate:.2%}, "
                f"Time: {bulk_result.total_time:.2f}s"
            )
            
            return {
                "success": bulk_result.success_rate > 0.95,  # High threshold for emails
                "total_emails": bulk_result.total_items,
                "sent_successfully": bulk_result.successful_items,
                "failed": bulk_result.failed_items,
                "success_rate": bulk_result.success_rate,
                "average_response_time": bulk_result.average_response_time,
                "rate_limited": bulk_result.rate_limited,
                "errors": bulk_result.errors[:5]
            }
        
        return send_bulk_emails_enhanced
    
    # ========================================
    # GOOGLE CALENDAR INTEGRATION IMPROVEMENTS
    # ========================================
    
    async def enhance_google_calendar_operations(self):
        """
        Enhanced Google Calendar operations with reliability.
        """
        
        async def sync_calendar_events_enhanced(calendar_id: str, events: List[Dict]):
            """Enhanced calendar sync with batch processing"""
            
            # Use intelligent batching for calendar events
            bulk_result = await self.reliability.execute_bulk_operation(
                provider=APIProvider.GOOGLE_CALENDAR,
                operation_name="create_event",
                items=events,
                api_call=self._create_calendar_event
            )
            
            return {
                "success": bulk_result.success_rate > 0.9,
                "total_events": bulk_result.total_items,
                "synced_successfully": bulk_result.successful_items,
                "failed_syncs": bulk_result.failed_items,
                "success_rate": bulk_result.success_rate,
                "sync_time": bulk_result.total_time,
                "errors": bulk_result.errors
            }
        
        return sync_calendar_events_enhanced
    
    # ========================================
    # HELPER METHODS FOR DEMONSTRATION
    # ========================================
    
    async def _send_single_sms(self, sms_data: Dict) -> Dict:
        """Example single SMS sending method"""
        # Your actual Twilio SMS sending logic here
        return {"sid": "SM123456789", "status": "sent"}
    
    async def _send_single_email(self, email_data: Dict) -> Dict:
        """Example single email sending method"""
        # Your actual SendGrid email sending logic here
        return {"message_id": "abc123", "status": "sent"}
    
    async def _create_calendar_event(self, event_data: Dict) -> Dict:
        """Example calendar event creation method"""
        # Your actual Google Calendar API logic here
        return {"id": "event123", "status": "confirmed"}
    
    async def _process_stripe_event(self, event_type: str, payload: bytes) -> Dict:
        """Example Stripe event processing"""
        # Your actual Stripe event processing logic here
        return {"processed": True, "event_type": event_type}
    
    async def _process_twilio_event(self, form_data: Dict) -> Dict:
        """Example Twilio event processing"""
        # Your actual Twilio event processing logic here
        return {"processed": True, "message_sid": form_data.get("MessageSid")}
    
    # ========================================
    # COMPREHENSIVE HEALTH CHECK
    # ========================================
    
    async def get_all_integrations_health(self) -> Dict[str, Any]:
        """Comprehensive health check for all API integrations"""
        
        health_checks = {}
        providers = [APIProvider.STRIPE, APIProvider.TWILIO, APIProvider.SENDGRID, APIProvider.GOOGLE_CALENDAR]
        
        for provider in providers:
            try:
                health_check = await self.reliability.health_check(provider)
                health_checks[provider.value] = {
                    "status": health_check["status"],
                    "response_time": health_check["response_time"],
                    "circuit_breaker_state": health_check["circuit_breaker_state"],
                    "recent_success_rate": health_check["recent_success_rate"]
                }
            except Exception as e:
                health_checks[provider.value] = {
                    "status": "error",
                    "error": str(e)
                }
        
        # Get overall system health
        performance_report = self.reliability.get_performance_report()
        webhook_security_metrics = self.webhook_security.get_security_metrics()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "individual_services": health_checks,
            "performance_summary": performance_report,
            "security_metrics": webhook_security_metrics,
            "overall_status": self._calculate_overall_status(health_checks)
        }
    
    def _calculate_overall_status(self, health_checks: Dict) -> str:
        """Calculate overall system status based on individual service health"""
        healthy_services = sum(1 for health in health_checks.values() if health.get("status") == "healthy")
        total_services = len(health_checks)
        
        if healthy_services == total_services:
            return "healthy"
        elif healthy_services >= total_services * 0.75:
            return "degraded"
        else:
            return "unhealthy"


# ========================================
# IMPLEMENTATION EXAMPLES
# ========================================

class ImplementationExamples:
    """
    Practical examples of how to apply these improvements to existing services.
    """
    
    @staticmethod
    def stripe_service_integration_example():
        """
        Example of how to integrate improvements into existing Stripe service.
        
        In your existing stripe_service.py, add:
        """
        integration_code = '''
        # At the top of your stripe_service.py:
        from services.api_integration_improvements import APIIntegrationImprovements
        
        class StripeSubscriptionService:
            def __init__(self, db: Session):
                self.db = db
                self.improvements = APIIntegrationImprovements(db)
            
            async def create_stripe_customer(self, user, organization):
                """Enhanced customer creation"""
                enhanced_create = await self.improvements.enhance_stripe_operations(self)
                return await enhanced_create(user, organization)
            
            async def process_webhook(self, payload, signature, source_ip):
                """Enhanced webhook processing"""
                enhanced_webhook = await self.improvements.enhance_stripe_webhooks()
                return await enhanced_webhook(payload, signature, source_ip)
        '''
        return integration_code
    
    @staticmethod
    def twilio_service_integration_example():
        """
        Example of how to integrate improvements into existing Twilio service.
        """
        integration_code = '''
        # In your existing twilio_sms_service.py:
        from services.api_integration_improvements import APIIntegrationImprovements
        
        class TwilioSMSService:
            def __init__(self, db: Session):
                self.db = db
                self.improvements = APIIntegrationImprovements(db)
            
            async def send_sms_campaign(self, recipients, message):
                """Enhanced bulk SMS with reliability"""
                enhanced_send = await self.improvements.enhance_twilio_operations()
                return await enhanced_send(recipients, message)
        '''
        return integration_code
    
    @staticmethod
    def webhook_router_integration_example():
        """
        Example of how to integrate improvements into webhook router.
        """
        integration_code = '''
        # In your existing routers/webhooks.py:
        from services.api_integration_improvements import APIIntegrationImprovements
        from fastapi import Request
        
        @router.post("/stripe")
        async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
            improvements = APIIntegrationImprovements(db)
            
            # Get request details
            payload = await request.body()
            signature = request.headers.get("stripe-signature")
            source_ip = request.client.host
            
            # Use enhanced webhook processing
            enhanced_webhook = await improvements.enhance_stripe_webhooks()
            result = await enhanced_webhook(payload, signature, source_ip)
            
            return result
        '''
        return integration_code


def get_api_integration_improvements(db: Session) -> APIIntegrationImprovements:
    """Dependency to get API integration improvements"""
    return APIIntegrationImprovements(db)
