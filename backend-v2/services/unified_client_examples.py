"""
Unified API Client Usage Examples

This file demonstrates how to use the unified API client for various integrations
with enterprise-grade reliability patterns.
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from services.unified_api_client import (
    unified_api_client,
    ApiProvider,
    ApiCredentials,
    AuthType,
    ApiRequest,
    RequestPriority,
    make_api_request,
    process_webhook,
    setup_all_providers
)
from config import settings


class UnifiedClientExamples:
    """Examples demonstrating unified API client usage."""
    
    def __init__(self):
        # Initialize all providers
        setup_all_providers()
    
    async def stripe_payment_example(self, amount: int, currency: str = "usd") -> Dict[str, Any]:
        """Example: Create Stripe payment intent with enterprise reliability."""
        try:
            request = ApiRequest(
                method="POST",
                url="https://api.stripe.com/v1/payment_intents",
                provider=ApiProvider.STRIPE,
                priority=RequestPriority.HIGH,  # Payment operations are high priority
                headers={
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data=f"amount={amount}&currency={currency}&automatic_payment_methods[enabled]=true",
                idempotency_key=f"payment_intent_{datetime.utcnow().isoformat()}_{amount}"
            )
            
            response = await unified_api_client.request(request)
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "payment_intent": response.json_data,
                    "response_time": response.response_time
                }
            else:
                return {
                    "success": False,
                    "error": response.content,
                    "status_code": response.status_code
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "fallback_used": True
            }
    
    async def anthropic_ai_example(self, message: str, model: str = "claude-3-sonnet-20240229") -> Dict[str, Any]:
        """Example: Generate AI response with caching and retries."""
        try:
            request = ApiRequest(
                method="POST",
                url="https://api.anthropic.com/v1/messages",
                provider=ApiProvider.ANTHROPIC,
                priority=RequestPriority.NORMAL,
                headers={
                    "Content-Type": "application/json",
                    "anthropic-version": "2023-06-01"
                },
                json_data={
                    "model": model,
                    "max_tokens": 500,
                    "messages": [{"role": "user", "content": message}]
                },
                cache_key=f"ai_response:{hash(message)}:{model}",
                cache_ttl=1800  # Cache for 30 minutes
            )
            
            response = await unified_api_client.request(request)
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "response": response.json_data["content"][0]["text"],
                    "cached": response.cached,
                    "response_time": response.response_time,
                    "usage": response.json_data.get("usage", {})
                }
            else:
                return {
                    "success": False,
                    "error": response.content,
                    "status_code": response.status_code
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "fallback_available": True
            }
    
    async def google_calendar_example(self, event_data: Dict[str, Any], access_token: str) -> Dict[str, Any]:
        """Example: Create Google Calendar event with OAuth2."""
        try:
            # Update credentials for this request
            credentials = ApiCredentials(
                auth_type=AuthType.BEARER,
                credentials={"token": access_token}
            )
            unified_api_client.credentials[ApiProvider.GOOGLE_CALENDAR] = credentials
            
            request = ApiRequest(
                method="POST",
                url="https://www.googleapis.com/calendar/v3/calendars/primary/events",
                provider=ApiProvider.GOOGLE_CALENDAR,
                priority=RequestPriority.NORMAL,
                headers={
                    "Content-Type": "application/json"
                },
                json_data=event_data,
                cache_key=f"calendar_event:{hash(json.dumps(event_data, sort_keys=True))}",
                cache_ttl=300
            )
            
            response = await unified_api_client.request(request)
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "event": response.json_data,
                    "event_id": response.json_data.get("id"),
                    "response_time": response.response_time
                }
            else:
                return {
                    "success": False,
                    "error": response.content,
                    "status_code": response.status_code
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "retry_recommended": True
            }
    
    async def sendgrid_email_example(self, to_email: str, subject: str, content: str) -> Dict[str, Any]:
        """Example: Send email via SendGrid with reliability patterns."""
        try:
            # Register SendGrid provider if not already done
            if ApiProvider.SENDGRID not in unified_api_client.credentials:
                credentials = ApiCredentials(
                    auth_type=AuthType.BEARER,
                    credentials={"token": settings.sendgrid_api_key}
                )
                unified_api_client.register_provider(ApiProvider.SENDGRID, credentials)
            
            email_data = {
                "personalizations": [{
                    "to": [{"email": to_email}],
                    "subject": subject
                }],
                "from": {"email": "noreply@bookedbarber.com"},
                "content": [{
                    "type": "text/html",
                    "value": content
                }]
            }
            
            request = ApiRequest(
                method="POST",
                url="https://api.sendgrid.com/v3/mail/send",
                provider=ApiProvider.SENDGRID,
                priority=RequestPriority.HIGH,  # Email delivery is high priority
                headers={
                    "Content-Type": "application/json"
                },
                json_data=email_data
            )
            
            response = await unified_api_client.request(request)
            
            if response.status_code == 202:
                return {
                    "success": True,
                    "message": "Email queued for delivery",
                    "response_time": response.response_time
                }
            else:
                return {
                    "success": False,
                    "error": response.content,
                    "status_code": response.status_code
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "retry_scheduled": True
            }
    
    async def twilio_sms_example(self, to_phone: str, message: str) -> Dict[str, Any]:
        """Example: Send SMS via Twilio with circuit breaker protection."""
        try:
            # Register Twilio provider if not already done
            if ApiProvider.TWILIO not in unified_api_client.credentials:
                credentials = ApiCredentials(
                    auth_type=AuthType.BASIC,
                    credentials={
                        "username": settings.twilio_account_sid,
                        "password": settings.twilio_auth_token
                    }
                )
                unified_api_client.register_provider(ApiProvider.TWILIO, credentials)
            
            request = ApiRequest(
                method="POST",
                url=f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json",
                provider=ApiProvider.TWILIO,
                priority=RequestPriority.HIGH,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data=f"To={to_phone}&From={settings.twilio_phone_number}&Body={message}"
            )
            
            response = await unified_api_client.request(request)
            
            if response.status_code == 201:
                return {
                    "success": True,
                    "message_sid": response.json_data.get("sid"),
                    "status": response.json_data.get("status"),
                    "response_time": response.response_time
                }
            else:
                return {
                    "success": False,
                    "error": response.content,
                    "status_code": response.status_code
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "circuit_breaker_triggered": True
            }
    
    async def webhook_processing_example(self, provider: str, headers: Dict[str, str], payload: str) -> Dict[str, Any]:
        """Example: Process incoming webhooks with security validation."""
        try:
            provider_enum = ApiProvider(provider.lower())
            
            # Get signature key based on provider
            signature_keys = {
                ApiProvider.STRIPE: settings.stripe_webhook_secret,
                ApiProvider.SENDGRID: getattr(settings, 'sendgrid_webhook_secret', None),
                ApiProvider.TWILIO: getattr(settings, 'twilio_webhook_secret', None),
            }
            
            signature_key = signature_keys.get(provider_enum)
            
            result = await process_webhook(
                provider_enum,
                headers,
                payload,
                signature_key
            )
            
            return {
                "success": True,
                "provider": provider,
                "processed": result["status"] == "processed",
                "result": result
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "provider": provider,
                "security_validated": False
            }
    
    async def batch_operations_example(self) -> Dict[str, Any]:
        """Example: Execute multiple API operations with priority handling."""
        operations = []
        
        # High priority: Payment processing
        operations.append(
            self.stripe_payment_example(2000, "usd")
        )
        
        # Normal priority: AI processing
        operations.append(
            self.anthropic_ai_example("Summarize the benefits of automated booking systems")
        )
        
        # High priority: Email notification
        operations.append(
            self.sendgrid_email_example(
                "customer@example.com",
                "Booking Confirmation",
                "Your appointment has been confirmed."
            )
        )
        
        # Low priority: SMS reminder (will be throttled if needed)
        operations.append(
            self.twilio_sms_example(
                "+1234567890",
                "Reminder: Your appointment is tomorrow at 2 PM"
            )
        )
        
        # Execute all operations concurrently
        results = await asyncio.gather(*operations, return_exceptions=True)
        
        return {
            "batch_completed": True,
            "total_operations": len(operations),
            "successful_operations": len([r for r in results if isinstance(r, dict) and r.get("success")]),
            "failed_operations": len([r for r in results if not isinstance(r, dict) or not r.get("success")]),
            "results": results
        }
    
    async def health_monitoring_example(self) -> Dict[str, Any]:
        """Example: Get comprehensive health report for all providers."""
        try:
            health_report = await unified_api_client.get_health_report()
            
            # Add custom analysis
            analysis = {
                "overall_status": health_report["overall_health"]["health_status"],
                "critical_alerts": len([
                    alert for alert in health_report["alerts"] 
                    if alert["severity"] == "critical"
                ]),
                "providers_with_issues": [
                    provider for provider, details in health_report["provider_details"].items()
                    if details["metrics"]["uptime_percentage"] < 95
                ],
                "performance_summary": {
                    "best_performing": min(
                        health_report["provider_details"].items(),
                        key=lambda x: x[1]["metrics"]["avg_response_time"]
                    )[0] if health_report["provider_details"] else None,
                    "most_reliable": max(
                        health_report["provider_details"].items(),
                        key=lambda x: x[1]["metrics"]["uptime_percentage"]
                    )[0] if health_report["provider_details"] else None
                }
            }
            
            return {
                "success": True,
                "health_report": health_report,
                "analysis": analysis,
                "monitoring_timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "fallback_monitoring": True
            }
    
    async def circuit_breaker_demo(self) -> Dict[str, Any]:
        """Example: Demonstrate circuit breaker behavior under failure conditions."""
        results = []
        
        # Simulate multiple failures to trigger circuit breaker
        for i in range(10):
            try:
                # This will likely fail and eventually open the circuit breaker
                request = ApiRequest(
                    method="GET",
                    url="https://httpstat.us/500",  # Always returns 500
                    provider=ApiProvider.GENERIC,
                    priority=RequestPriority.LOW
                )
                
                response = await unified_api_client.request(request)
                results.append({
                    "attempt": i + 1,
                    "success": True,
                    "status_code": response.status_code,
                    "circuit_state": response.circuit_breaker_state.value if response.circuit_breaker_state else "unknown"
                })
                
            except Exception as e:
                results.append({
                    "attempt": i + 1,
                    "success": False,
                    "error": str(e),
                    "circuit_breaker_active": "circuit breaker" in str(e).lower()
                })
                
                # If circuit breaker is open, break the loop
                if "circuit breaker" in str(e).lower() and "OPEN" in str(e):
                    break
        
        return {
            "demo_completed": True,
            "total_attempts": len(results),
            "circuit_breaker_triggered": any(r.get("circuit_breaker_active") for r in results),
            "results": results
        }


# Usage examples and testing functions
async def run_basic_examples():
    """Run basic API client examples."""
    examples = UnifiedClientExamples()
    
    print("🚀 Running Unified API Client Examples...\n")
    
    # Test AI integration
    print("1. Testing Anthropic AI integration...")
    ai_result = await examples.anthropic_ai_example("What are the benefits of automated scheduling?")
    print(f"   Result: {ai_result['success']}, Cached: {ai_result.get('cached', False)}")
    if ai_result['success']:
        print(f"   Response: {ai_result['response'][:100]}...")
    print()
    
    # Test health monitoring
    print("2. Testing health monitoring...")
    health_result = await examples.health_monitoring_example()
    print(f"   Overall Status: {health_result.get('analysis', {}).get('overall_status', 'unknown')}")
    print(f"   Critical Alerts: {health_result.get('analysis', {}).get('critical_alerts', 0)}")
    print()
    
    # Test batch operations
    print("3. Testing batch operations...")
    batch_result = await examples.batch_operations_example()
    print(f"   Successful: {batch_result['successful_operations']}/{batch_result['total_operations']}")
    print()
    
    print("✅ Examples completed successfully!")


async def run_advanced_examples():
    """Run advanced API client examples."""
    examples = UnifiedClientExamples()
    
    print("🔧 Running Advanced Unified API Client Examples...\n")
    
    # Test circuit breaker
    print("1. Testing circuit breaker behavior...")
    circuit_result = await examples.circuit_breaker_demo()
    print(f"   Circuit Breaker Triggered: {circuit_result['circuit_breaker_triggered']}")
    print(f"   Total Attempts: {circuit_result['total_attempts']}")
    print()
    
    # Test webhook processing
    print("2. Testing webhook processing...")
    webhook_headers = {
        "Content-Type": "application/json",
        "Stripe-Signature": "test_signature"
    }
    webhook_payload = '{"type": "payment_intent.succeeded", "data": {"object": {"id": "pi_test"}}}'
    
    webhook_result = await examples.webhook_processing_example("stripe", webhook_headers, webhook_payload)
    print(f"   Webhook Processed: {webhook_result['success']}")
    print()
    
    print("✅ Advanced examples completed!")


if __name__ == "__main__":
    # Run examples
    asyncio.run(run_basic_examples())
    asyncio.run(run_advanced_examples())