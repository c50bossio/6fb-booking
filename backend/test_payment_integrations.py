#!/usr/bin/env python3
"""
Comprehensive Payment Integration Test Suite
Tests both Stripe and Square payment systems for functionality
"""

import os
import sys
import json
import asyncio
import httpx
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config.settings import get_settings
from services.stripe_connect_service import StripeConnectService
from services.square_service import SquareService


class PaymentIntegrationTester:
    """Test suite for payment integrations"""
    
    def __init__(self):
        self.settings = get_settings()
        self.results = {
            "stripe": {},
            "square": {},
            "overall": {"passed": 0, "failed": 0, "errors": []}
        }
        
    def log_result(self, test_name: str, provider: str, success: bool, details: str = ""):
        """Log test result"""
        self.results[provider][test_name] = {
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        
        if success:
            self.results["overall"]["passed"] += 1
            print(f"✅ {provider.upper()} - {test_name}: PASSED")
        else:
            self.results["overall"]["failed"] += 1
            self.results["overall"]["errors"].append(f"{provider}: {test_name} - {details}")
            print(f"❌ {provider.upper()} - {test_name}: FAILED - {details}")
            
        if details:
            print(f"   Details: {details}")
    
    def test_environment_variables(self):
        """Test that required environment variables are set"""
        print("\n🔧 Testing Environment Variables...")
        
        # Stripe variables
        stripe_vars = {
            "STRIPE_SECRET_KEY": self.settings.STRIPE_SECRET_KEY,
            "STRIPE_PUBLISHABLE_KEY": self.settings.STRIPE_PUBLISHABLE_KEY,
            "STRIPE_WEBHOOK_SECRET": self.settings.STRIPE_WEBHOOK_SECRET
        }
        
        for var_name, var_value in stripe_vars.items():
            success = bool(var_value and var_value.strip())
            self.log_result(
                f"Environment Variable {var_name}",
                "stripe",
                success,
                f"Value: {'Set' if success else 'Missing'}"
            )
        
        # Square variables
        square_vars = {
            "SQUARE_APPLICATION_ID": os.getenv("SQUARE_APPLICATION_ID"),
            "SQUARE_ACCESS_TOKEN": os.getenv("SQUARE_ACCESS_TOKEN"),
            "SQUARE_ENVIRONMENT": os.getenv("SQUARE_ENVIRONMENT", "sandbox")
        }
        
        for var_name, var_value in square_vars.items():
            success = bool(var_value and var_value.strip())
            self.log_result(
                f"Environment Variable {var_name}",
                "square",
                success,
                f"Value: {'Set' if success else 'Missing'}"
            )
    
    def test_stripe_connection(self):
        """Test Stripe API connection"""
        print("\n🔌 Testing Stripe Connection...")
        
        try:
            stripe_service = StripeConnectService()
            
            # Test basic connection by trying to get balance
            import stripe
            balance = stripe.Balance.retrieve()
            
            self.log_result(
                "API Connection",
                "stripe",
                True,
                f"Connected successfully. Available balance: ${balance.available[0].amount / 100 if balance.available else 0:.2f}"
            )
            
        except Exception as e:
            self.log_result(
                "API Connection",
                "stripe",
                False,
                f"Connection failed: {str(e)}"
            )
    
    def test_stripe_connect_oauth(self):
        """Test Stripe Connect OAuth URL generation"""
        print("\n🔗 Testing Stripe Connect OAuth...")
        
        try:
            stripe_service = StripeConnectService()
            
            # Test OAuth URL generation
            test_state = "test_state_123"
            oauth_url = stripe_service.create_oauth_link(test_state)
            
            success = oauth_url and oauth_url.startswith("https://connect.stripe.com/oauth/authorize")
            
            self.log_result(
                "OAuth URL Generation",
                "stripe",
                success,
                f"URL: {oauth_url[:100]}..." if success else "Failed to generate OAuth URL"
            )
            
        except Exception as e:
            self.log_result(
                "OAuth URL Generation",
                "stripe",
                False,
                f"Error: {str(e)}"
            )
    
    def test_square_connection(self):
        """Test Square API connection"""
        print("\n🔌 Testing Square Connection...")
        
        try:
            square_service = SquareService()
            
            # Test connection
            connection_test = square_service.test_connection()
            
            self.log_result(
                "API Connection",
                "square",
                connection_test,
                "Connected successfully" if connection_test else "Connection failed"
            )
            
            # Test merchant info
            if connection_test:
                merchant_info = square_service.get_merchant_info()
                if merchant_info:
                    self.log_result(
                        "Merchant Info Retrieval",
                        "square",
                        True,
                        f"Merchant ID: {merchant_info.get('merchant', {}).get('id', 'Unknown')}"
                    )
                else:
                    self.log_result(
                        "Merchant Info Retrieval",
                        "square",
                        False,
                        "Could not retrieve merchant information"
                    )
            
        except Exception as e:
            self.log_result(
                "API Connection",
                "square",
                False,
                f"Connection failed: {str(e)}"
            )
    
    async def test_api_endpoints(self):
        """Test API endpoints availability"""
        print("\n🌐 Testing API Endpoints...")
        
        base_url = os.getenv("BACKEND_URL", "http://localhost:8000")
        
        endpoints_to_test = [
            "/api/v1/stripe-connect/status/1",
            "/api/v1/payments/payment-methods", 
            "/api/v1/square/locations",
            "/api/v1/barber-payments/commissions/summary",
            "/api/v1/webhooks/stripe"
        ]
        
        async with httpx.AsyncClient() as client:
            for endpoint in endpoints_to_test:
                try:
                    # Note: This will likely fail with auth errors, but we're just testing if endpoints exist
                    response = await client.get(f"{base_url}{endpoint}", timeout=5.0)
                    
                    # Any response (even 401/403) means the endpoint exists
                    success = response.status_code != 404
                    
                    self.log_result(
                        f"Endpoint {endpoint}",
                        "stripe" if "stripe" in endpoint else "square",
                        success,
                        f"Status: {response.status_code}"
                    )
                    
                except httpx.TimeoutException:
                    self.log_result(
                        f"Endpoint {endpoint}",
                        "stripe" if "stripe" in endpoint else "square",
                        False,
                        "Timeout - Server not running?"
                    )
                except Exception as e:
                    self.log_result(
                        f"Endpoint {endpoint}",
                        "stripe" if "stripe" in endpoint else "square",
                        False,
                        f"Error: {str(e)}"
                    )
    
    def test_webhook_signature_validation(self):
        """Test webhook signature validation"""
        print("\n🔐 Testing Webhook Security...")
        
        # Test Stripe webhook signature validation
        webhook_secret = self.settings.STRIPE_WEBHOOK_SECRET
        if webhook_secret:
            try:
                import stripe
                
                # Create a test payload
                test_payload = '{"id": "evt_test_webhook", "object": "event"}'
                test_signature = stripe.WebhookSignature._compute_signature(
                    int(datetime.now().timestamp()), test_payload, webhook_secret
                )
                
                # Try to verify it
                stripe.Webhook.construct_event(
                    test_payload, 
                    f"t={int(datetime.now().timestamp())},v1={test_signature}",
                    webhook_secret
                )
                
                self.log_result(
                    "Webhook Signature Validation",
                    "stripe",
                    True,
                    "Signature validation working correctly"
                )
                
            except Exception as e:
                self.log_result(
                    "Webhook Signature Validation",
                    "stripe",
                    False,
                    f"Signature validation failed: {str(e)}"
                )
        else:
            self.log_result(
                "Webhook Signature Validation",
                "stripe",
                False,
                "Webhook secret not configured"
            )
    
    def test_database_models(self):
        """Test that payment-related database models can be imported"""
        print("\n🗄️  Testing Database Models...")
        
        try:
            from models.payment import Payment, PaymentMethod, PaymentStatus
            from models.barber_payment import BarberPaymentModel, ProductSale, CommissionPayment
            
            self.log_result(
                "Payment Models Import",
                "stripe",
                True,
                "All payment models imported successfully"
            )
            
        except Exception as e:
            self.log_result(
                "Payment Models Import",
                "stripe",
                False,
                f"Model import failed: {str(e)}"
            )
    
    def generate_report(self):
        """Generate comprehensive test report"""
        print("\n" + "="*60)
        print("📊 PAYMENT INTEGRATION TEST REPORT")
        print("="*60)
        
        print(f"\n📈 Overall Results:")
        print(f"   ✅ Passed: {self.results['overall']['passed']}")
        print(f"   ❌ Failed: {self.results['overall']['failed']}")
        print(f"   📊 Success Rate: {(self.results['overall']['passed'] / (self.results['overall']['passed'] + self.results['overall']['failed']) * 100):.1f}%")
        
        # Stripe Results
        stripe_tests = self.results['stripe']
        stripe_passed = sum(1 for test in stripe_tests.values() if test['success'])
        stripe_total = len(stripe_tests)
        
        print(f"\n💳 Stripe Integration:")
        print(f"   Tests: {stripe_passed}/{stripe_total} passed")
        if stripe_total > 0:
            print(f"   Success Rate: {(stripe_passed/stripe_total*100):.1f}%")
        
        # Square Results  
        square_tests = self.results['square']
        square_passed = sum(1 for test in square_tests.values() if test['success'])
        square_total = len(square_tests)
        
        print(f"\n🟦 Square Integration:")
        print(f"   Tests: {square_passed}/{square_total} passed")
        if square_total > 0:
            print(f"   Success Rate: {(square_passed/square_total*100):.1f}%")
        
        # Critical Issues
        if self.results['overall']['errors']:
            print(f"\n⚠️  Critical Issues Found:")
            for error in self.results['overall']['errors']:
                print(f"   • {error}")
        
        # Recommendations
        print(f"\n💡 Recommendations:")
        
        if not self.settings.STRIPE_SECRET_KEY:
            print("   • Set STRIPE_SECRET_KEY environment variable")
        if not self.settings.STRIPE_WEBHOOK_SECRET:
            print("   • Configure STRIPE_WEBHOOK_SECRET for secure webhooks")
        if not os.getenv("SQUARE_ACCESS_TOKEN"):
            print("   • Set SQUARE_ACCESS_TOKEN for Square integration")
        
        # Save detailed results
        report_file = f"payment_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n📄 Detailed report saved to: {report_file}")
        
        return self.results['overall']['failed'] == 0


async def main():
    """Run all payment integration tests"""
    print("🚀 Starting Payment Integration Tests...")
    
    tester = PaymentIntegrationTester()
    
    # Run all tests
    tester.test_environment_variables()
    tester.test_stripe_connection()
    tester.test_stripe_connect_oauth()
    tester.test_square_connection()
    await tester.test_api_endpoints()
    tester.test_webhook_signature_validation()
    tester.test_database_models()
    
    # Generate report
    success = tester.generate_report()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())