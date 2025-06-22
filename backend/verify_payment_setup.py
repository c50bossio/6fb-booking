#!/usr/bin/env python3
"""
Quick Payment Setup Verification Script
Verifies that payment integrations are properly configured
"""

import os
import sys
import json
import asyncio
import httpx
from datetime import datetime
from typing import Dict, List, Optional

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config.settings import get_settings


class PaymentSetupVerifier:
    """Verifies payment setup configuration"""
    
    def __init__(self):
        self.settings = get_settings()
        self.results = {
            "environment_variables": {},
            "api_connectivity": {},
            "webhook_configuration": {},
            "frontend_configuration": {},
            "overall_status": "unknown"
        }
        
    def check_environment_variables(self):
        """Check if required environment variables are set"""
        print("🔧 Checking Environment Variables...")
        
        required_vars = {
            "STRIPE_SECRET_KEY": "Stripe API secret key",
            "STRIPE_PUBLISHABLE_KEY": "Stripe publishable key", 
            "STRIPE_WEBHOOK_SECRET": "Stripe webhook secret",
            "STRIPE_CONNECT_CLIENT_ID": "Stripe Connect client ID (optional)",
            "SQUARE_ACCESS_TOKEN": "Square access token (optional)",
            "SQUARE_APPLICATION_ID": "Square application ID (optional)"
        }
        
        for var_name, description in required_vars.items():
            value = os.getenv(var_name)
            is_set = bool(value and value.strip() and not value.startswith("your-") and not value.startswith("sk_test_placeholder"))
            
            self.results["environment_variables"][var_name] = {
                "set": is_set,
                "description": description,
                "masked_value": f"{value[:8]}..." if is_set and len(value) > 8 else "Not set"
            }
            
            status = "✅" if is_set else "❌"
            print(f"  {status} {var_name}: {description}")
    
    def check_stripe_connection(self):
        """Test Stripe API connectivity"""
        print("\n💳 Testing Stripe Connection...")
        
        try:
            import stripe
            stripe.api_key = self.settings.STRIPE_SECRET_KEY
            
            # Test basic API call
            balance = stripe.Balance.retrieve()
            
            self.results["api_connectivity"]["stripe"] = {
                "connected": True,
                "available_balance": balance.available[0].amount / 100 if balance.available else 0,
                "currency": balance.available[0].currency if balance.available else "usd"
            }
            
            print("  ✅ Stripe API connection successful")
            print(f"  💰 Available balance: ${balance.available[0].amount / 100:.2f}" if balance.available else "  💰 Balance: N/A")
            
        except Exception as e:
            self.results["api_connectivity"]["stripe"] = {
                "connected": False,
                "error": str(e)
            }
            print(f"  ❌ Stripe connection failed: {str(e)}")
    
    def check_square_connection(self):
        """Test Square API connectivity"""
        print("\n🟦 Testing Square Connection...")
        
        try:
            from services.square_service import SquareService
            square_service = SquareService()
            
            # Test connection
            connection_test = square_service.test_connection()
            
            if connection_test:
                merchant_info = square_service.get_merchant_info()
                
                self.results["api_connectivity"]["square"] = {
                    "connected": True,
                    "merchant_id": merchant_info.get("merchant", {}).get("id", "Unknown") if merchant_info else "Unknown"
                }
                
                print("  ✅ Square API connection successful")
                if merchant_info:
                    print(f"  🏪 Merchant ID: {merchant_info.get('merchant', {}).get('id', 'Unknown')}")
            else:
                self.results["api_connectivity"]["square"] = {
                    "connected": False,
                    "error": "Connection test failed"
                }
                print("  ❌ Square connection failed")
                
        except Exception as e:
            self.results["api_connectivity"]["square"] = {
                "connected": False,
                "error": str(e)
            }
            print(f"  ❌ Square connection failed: {str(e)}")
    
    async def check_api_endpoints(self):
        """Test API endpoints are available"""
        print("\n🌐 Testing API Endpoints...")
        
        base_url = "http://localhost:8000"
        
        endpoints_to_test = [
            "/api/v1/webhooks/stripe",
            "/api/v1/payments/payment-methods", 
            "/api/v1/stripe-connect/status/1",
            "/api/v1/square/locations"
        ]
        
        async with httpx.AsyncClient() as client:
            for endpoint in endpoints_to_test:
                try:
                    response = await client.get(f"{base_url}{endpoint}", timeout=5.0)
                    
                    # Any response (even 401/403) means the endpoint exists
                    endpoint_exists = response.status_code != 404
                    
                    self.results["api_connectivity"][f"endpoint_{endpoint.split('/')[-1]}"] = {
                        "available": endpoint_exists,
                        "status_code": response.status_code
                    }
                    
                    status = "✅" if endpoint_exists else "❌"
                    print(f"  {status} {endpoint}: Status {response.status_code}")
                    
                except httpx.TimeoutException:
                    print(f"  ⏰ {endpoint}: Timeout - Server not running?")
                    self.results["api_connectivity"][f"endpoint_{endpoint.split('/')[-1]}"] = {
                        "available": False,
                        "error": "Timeout"
                    }
                except Exception as e:
                    print(f"  ❌ {endpoint}: Error - {str(e)}")
                    self.results["api_connectivity"][f"endpoint_{endpoint.split('/')[-1]}"] = {
                        "available": False,
                        "error": str(e)
                    }
    
    def check_webhook_configuration(self):
        """Check webhook configuration"""
        print("\n🪝 Checking Webhook Configuration...")
        
        webhook_secret = self.settings.STRIPE_WEBHOOK_SECRET
        
        if webhook_secret and webhook_secret.startswith("whsec_"):
            try:
                import stripe
                
                # Test webhook signature validation
                test_payload = '{"id": "evt_test_webhook", "object": "event"}'
                test_signature = stripe.WebhookSignature._compute_signature(
                    int(datetime.now().timestamp()), test_payload, webhook_secret
                )
                
                stripe.Webhook.construct_event(
                    test_payload, 
                    f"t={int(datetime.now().timestamp())},v1={test_signature}",
                    webhook_secret
                )
                
                self.results["webhook_configuration"]["stripe"] = {
                    "configured": True,
                    "signature_validation": True
                }
                
                print("  ✅ Stripe webhook secret configured and working")
                
            except Exception as e:
                self.results["webhook_configuration"]["stripe"] = {
                    "configured": True,
                    "signature_validation": False,
                    "error": str(e)
                }
                print(f"  ⚠️  Stripe webhook secret configured but validation failed: {str(e)}")
        else:
            self.results["webhook_configuration"]["stripe"] = {
                "configured": False
            }
            print("  ❌ Stripe webhook secret not configured")
    
    def check_frontend_configuration(self):
        """Check frontend configuration files"""
        print("\n🎨 Checking Frontend Configuration...")
        
        frontend_env_path = "/Users/bossio/6fb-booking/frontend/.env.local"
        
        if os.path.exists(frontend_env_path):
            with open(frontend_env_path, 'r') as f:
                frontend_env = f.read()
                
            has_stripe_key = "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" in frontend_env
            has_api_url = "NEXT_PUBLIC_API_URL" in frontend_env
            
            self.results["frontend_configuration"] = {
                "env_file_exists": True,
                "stripe_key_configured": has_stripe_key,
                "api_url_configured": has_api_url
            }
            
            print(f"  ✅ Frontend .env.local exists")
            print(f"  {'✅' if has_stripe_key else '❌'} Stripe publishable key configured")
            print(f"  {'✅' if has_api_url else '❌'} API URL configured")
            
        else:
            self.results["frontend_configuration"] = {
                "env_file_exists": False
            }
            print("  ❌ Frontend .env.local file not found")
            print("  ⚠️  Create frontend/.env.local with NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")
    
    def generate_report(self):
        """Generate comprehensive verification report"""
        print("\n" + "="*60)
        print("📊 PAYMENT SETUP VERIFICATION REPORT")
        print("="*60)
        
        # Count successes
        env_vars_ok = sum(1 for v in self.results["environment_variables"].values() if v["set"])
        total_env_vars = len(self.results["environment_variables"])
        
        api_connections = [v for k, v in self.results["api_connectivity"].items() if "connected" in v]
        api_ok = sum(1 for v in api_connections if v.get("connected", False))
        
        webhooks_ok = sum(1 for v in self.results["webhook_configuration"].values() if v.get("configured", False))
        total_webhooks = len(self.results["webhook_configuration"])
        
        # Overall status
        critical_issues = []
        
        if not self.results["environment_variables"]["STRIPE_SECRET_KEY"]["set"]:
            critical_issues.append("Stripe secret key not configured")
        if not self.results["environment_variables"]["STRIPE_PUBLISHABLE_KEY"]["set"]:
            critical_issues.append("Stripe publishable key not configured")
        if not self.results["webhook_configuration"].get("stripe", {}).get("configured", False):
            critical_issues.append("Stripe webhook not configured")
        
        if len(critical_issues) == 0:
            overall_status = "✅ READY FOR PAYMENTS"
            self.results["overall_status"] = "ready"
        elif len(critical_issues) <= 2:
            overall_status = "⚠️  NEEDS MINOR FIXES"
            self.results["overall_status"] = "minor_issues"
        else:
            overall_status = "❌ NEEDS SETUP"
            self.results["overall_status"] = "needs_setup"
        
        print(f"\n🎯 Overall Status: {overall_status}")
        
        print(f"\n📈 Configuration Summary:")
        print(f"   Environment Variables: {env_vars_ok}/{total_env_vars} configured")
        print(f"   API Connections: {api_ok}/{len(api_connections)} working")
        print(f"   Webhooks: {webhooks_ok}/{max(total_webhooks, 1)} configured")
        
        if critical_issues:
            print(f"\n⚠️  Critical Issues:")
            for issue in critical_issues:
                print(f"   • {issue}")
        
        # Next steps
        print(f"\n💡 Next Steps:")
        if self.results["overall_status"] == "ready":
            print("   • Your payment system is ready!")
            print("   • Test payment flows in the frontend")
            print("   • Set up monitoring for production")
        elif self.results["overall_status"] == "minor_issues":
            print("   • Fix the critical issues listed above")
            print("   • Re-run this verification script")
            print("   • Test payment flows when ready")
        else:
            print("   • Follow the setup guide in .env.payment.template")
            print("   • Configure Stripe credentials first")
            print("   • Re-run this script to verify")
        
        # Save detailed results
        report_file = f"payment_verification_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n📄 Detailed report saved to: {report_file}")
        
        return self.results["overall_status"] == "ready"


async def main():
    """Run payment setup verification"""
    print("🚀 Payment Setup Verification")
    print("="*40)
    
    verifier = PaymentSetupVerifier()
    
    # Run all checks
    verifier.check_environment_variables()
    verifier.check_stripe_connection()
    verifier.check_square_connection()
    await verifier.check_api_endpoints()
    verifier.check_webhook_configuration()
    verifier.check_frontend_configuration()
    
    # Generate report
    success = verifier.generate_report()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())