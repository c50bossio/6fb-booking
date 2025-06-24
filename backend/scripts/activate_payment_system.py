#!/usr/bin/env python3
"""
Payment System Activation Script
Safely activates and tests the payment and payout system
"""

import os
import sys
import stripe
import requests
from datetime import datetime
from typing import Dict, Any, Optional
from colorama import init, Fore, Style
import json

# Initialize colorama for colored output
init(autoreset=True)

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.settings import settings
from config.database import SessionLocal
from models.barber import Barber
from models.location import Location
from services.stripe_connect_service import StripeConnectService


class PaymentSystemActivator:
    def __init__(self):
        self.db = SessionLocal()
        self.stripe_service = StripeConnectService()
        self.test_results = []

    def print_header(self, text: str):
        """Print a formatted header"""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}{text.center(60)}")
        print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}\n")

    def print_success(self, message: str):
        """Print success message"""
        print(f"{Fore.GREEN}✅ {message}{Style.RESET_ALL}")
        self.test_results.append({"status": "success", "message": message})

    def print_error(self, message: str):
        """Print error message"""
        print(f"{Fore.RED}❌ {message}{Style.RESET_ALL}")
        self.test_results.append({"status": "error", "message": message})

    def print_warning(self, message: str):
        """Print warning message"""
        print(f"{Fore.YELLOW}⚠️  {message}{Style.RESET_ALL}")
        self.test_results.append({"status": "warning", "message": message})

    def print_info(self, message: str):
        """Print info message"""
        print(f"{Fore.BLUE}ℹ️  {message}{Style.RESET_ALL}")

    def check_environment(self) -> bool:
        """Check if environment is properly configured"""
        self.print_header("ENVIRONMENT CHECK")

        issues = []

        # Check Stripe keys
        if not settings.STRIPE_SECRET_KEY:
            issues.append("STRIPE_SECRET_KEY not configured")
        elif settings.STRIPE_SECRET_KEY.startswith("sk_test_"):
            self.print_warning("Using TEST Stripe keys")
        else:
            self.print_success("Using LIVE Stripe keys")

        if not settings.STRIPE_PUBLISHABLE_KEY:
            issues.append("STRIPE_PUBLISHABLE_KEY not configured")

        if not settings.STRIPE_CONNECT_CLIENT_ID:
            issues.append("STRIPE_CONNECT_CLIENT_ID not configured")

        # Check database
        if "sqlite" in settings.DATABASE_URL.lower():
            self.print_warning("Using SQLite database (not recommended for production)")
        else:
            self.print_success("Using PostgreSQL database")

        # Check webhook secret
        if not settings.STRIPE_WEBHOOK_SECRET:
            self.print_warning(
                "STRIPE_WEBHOOK_SECRET not configured - webhooks won't work"
            )
        else:
            self.print_success("Webhook secret configured")

        # Report issues
        if issues:
            for issue in issues:
                self.print_error(issue)
            return False

        return True

    def test_stripe_connection(self) -> bool:
        """Test Stripe API connection"""
        self.print_header("STRIPE CONNECTION TEST")

        try:
            stripe.api_key = settings.STRIPE_SECRET_KEY

            # Test basic API call
            account = stripe.Account.retrieve()
            self.print_success(f"Connected to Stripe account: {account.id}")

            # Check capabilities
            if hasattr(account, "capabilities"):
                caps = account.capabilities
                self.print_info(f"Card payments: {caps.card_payments}")
                self.print_info(f"Transfers: {caps.transfers}")

                if caps.card_payments != "active":
                    self.print_warning("Card payments not fully activated")
                if caps.transfers != "active":
                    self.print_warning(
                        "Transfers not fully activated - needed for payouts"
                    )

            # Test creating a payment intent
            try:
                test_intent = stripe.PaymentIntent.create(
                    amount=100,  # $1.00
                    currency="usd",
                    metadata={"test": "true", "system": "6fb_activation_test"},
                )
                self.print_success(f"Created test payment intent: {test_intent.id}")

                # Cancel it immediately
                stripe.PaymentIntent.cancel(test_intent.id)
                self.print_info("Test payment intent cancelled")

            except stripe.error.StripeError as e:
                self.print_error(f"Cannot create payment intents: {e}")
                return False

            return True

        except stripe.error.StripeError as e:
            self.print_error(f"Stripe connection failed: {e}")
            return False

    def check_barber_connections(self) -> Dict[str, Any]:
        """Check Stripe Connect status for all barbers"""
        self.print_header("BARBER STRIPE CONNECT STATUS")

        barbers = self.db.query(Barber).filter(Barber.is_active == True).all()

        if not barbers:
            self.print_warning("No active barbers found")
            return {"total": 0, "connected": 0, "pending": 0}

        connected = 0
        pending = 0

        print(f"Found {len(barbers)} active barbers:\n")

        for barber in barbers:
            status = "❌ Not Connected"

            if barber.stripe_account_id:
                try:
                    account = stripe.Account.retrieve(barber.stripe_account_id)
                    if account.charges_enabled and account.payouts_enabled:
                        status = "✅ Fully Connected"
                        connected += 1
                    else:
                        status = "🟡 Partially Connected"
                        pending += 1
                        if not account.charges_enabled:
                            status += " (charges disabled)"
                        if not account.payouts_enabled:
                            status += " (payouts disabled)"
                except:
                    status = "❌ Invalid Account"

            print(f"  {barber.full_name}: {status}")

        print(f"\nSummary:")
        self.print_info(f"Total barbers: {len(barbers)}")
        self.print_success(f"Fully connected: {connected}")
        self.print_warning(f"Partially connected: {pending}")
        self.print_error(f"Not connected: {len(barbers) - connected - pending}")

        return {
            "total": len(barbers),
            "connected": connected,
            "pending": pending,
            "not_connected": len(barbers) - connected - pending,
        }

    def test_payment_flow(self) -> bool:
        """Test a complete payment flow"""
        self.print_header("PAYMENT FLOW TEST")

        try:
            # Get a test location
            location = self.db.query(Location).first()
            if not location:
                self.print_error("No locations found in database")
                return False

            # Create a test payment intent
            amount = 5000  # $50.00

            payment_intent = stripe.PaymentIntent.create(
                amount=amount,
                currency="usd",
                metadata={
                    "location_id": str(location.id),
                    "test": "true",
                    "created_by": "activation_script",
                },
                description="Test payment for activation",
            )

            self.print_success(f"Created payment intent: {payment_intent.id}")
            self.print_info(f"Amount: ${amount/100:.2f}")
            self.print_info(f"Status: {payment_intent.status}")

            # Test refund capability
            if payment_intent.status == "requires_payment_method":
                self.print_info(
                    "Payment intent created successfully (awaiting payment method)"
                )

                # Cancel the test intent
                cancelled = stripe.PaymentIntent.cancel(payment_intent.id)
                self.print_success("Test payment intent cancelled successfully")

            return True

        except stripe.error.StripeError as e:
            self.print_error(f"Payment flow test failed: {e}")
            return False
        except Exception as e:
            self.print_error(f"Unexpected error: {e}")
            return False

    def test_payout_calculation(self) -> bool:
        """Test payout calculation for a barber"""
        self.print_header("PAYOUT CALCULATION TEST")

        # Get a barber with commission settings
        barber = (
            self.db.query(Barber)
            .filter(Barber.is_active == True, Barber.commission_rate > 0)
            .first()
        )

        if not barber:
            self.print_warning("No active barbers with commission rates found")
            return True

        # Test calculations
        service_amount = 50.00
        tip_amount = 10.00
        total_amount = service_amount + tip_amount

        print(f"Testing payout for: {barber.full_name}")
        print(f"Commission rate: {barber.commission_rate}%")
        print(f"Service amount: ${service_amount:.2f}")
        print(f"Tip amount: ${tip_amount:.2f}")
        print(f"Total amount: ${total_amount:.2f}")

        # Calculate payouts
        if barber.is_booth_renter:
            # Booth renter gets everything minus booth rent (calculated separately)
            barber_payout = total_amount
            shop_payout = 0
            self.print_info(
                "Booth renter - gets full amount (booth rent calculated separately)"
            )
        else:
            # Commission-based
            barber_service_payout = service_amount * (barber.commission_rate / 100)
            barber_payout = barber_service_payout + tip_amount
            shop_payout = service_amount - barber_service_payout

        print(f"\nCalculated payouts:")
        self.print_success(f"Barber payout: ${barber_payout:.2f}")
        self.print_info(f"Shop payout: ${shop_payout:.2f}")

        return True

    def generate_activation_report(self):
        """Generate activation report"""
        self.print_header("ACTIVATION REPORT")

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Count results
        success_count = len([r for r in self.test_results if r["status"] == "success"])
        warning_count = len([r for r in self.test_results if r["status"] == "warning"])
        error_count = len([r for r in self.test_results if r["status"] == "error"])

        print(f"Test Results:")
        print(f"  ✅ Success: {success_count}")
        print(f"  ⚠️  Warnings: {warning_count}")
        print(f"  ❌ Errors: {error_count}")

        # Save detailed report
        report = {
            "timestamp": timestamp,
            "environment": settings.ENVIRONMENT,
            "stripe_mode": (
                "live" if settings.STRIPE_SECRET_KEY.startswith("sk_live_") else "test"
            ),
            "results": self.test_results,
            "summary": {
                "success": success_count,
                "warnings": warning_count,
                "errors": error_count,
            },
        }

        report_file = f"payment_activation_report_{timestamp}.json"
        with open(report_file, "w") as f:
            json.dump(report, f, indent=2)

        self.print_info(f"Detailed report saved to: {report_file}")

        # Provide recommendations
        if error_count > 0:
            print(
                f"\n{Fore.RED}⚠️  ACTIVATION INCOMPLETE - Please fix errors before going live{Style.RESET_ALL}"
            )
        elif warning_count > 0:
            print(
                f"\n{Fore.YELLOW}⚠️  ACTIVATION SUCCESSFUL WITH WARNINGS - Review warnings before full production use{Style.RESET_ALL}"
            )
        else:
            print(
                f"\n{Fore.GREEN}✅ PAYMENT SYSTEM READY FOR PRODUCTION!{Style.RESET_ALL}"
            )

    def run_activation(self):
        """Run the complete activation process"""
        self.print_header("6FB PAYMENT SYSTEM ACTIVATION")
        print("Starting payment system activation and verification...")
        print(f"Environment: {settings.ENVIRONMENT}")
        print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        # Run all checks
        env_ok = self.check_environment()
        if not env_ok:
            self.print_error(
                "\nEnvironment check failed. Please fix configuration issues."
            )
            return

        stripe_ok = self.test_stripe_connection()
        if not stripe_ok:
            self.print_error("\nStripe connection failed. Please check your API keys.")
            return

        # Check barber connections
        self.check_barber_connections()

        # Test payment flow
        self.test_payment_flow()

        # Test payout calculations
        self.test_payout_calculation()

        # Generate report
        self.generate_activation_report()

        # Close database connection
        self.db.close()


def main():
    """Main entry point"""
    print("🚀 6FB Payment System Activation Tool")
    print("This tool will verify and activate your payment system configuration.\n")

    # Confirm before proceeding
    response = input("Do you want to proceed with activation checks? (yes/no): ")
    if response.lower() not in ["yes", "y"]:
        print("Activation cancelled.")
        return

    activator = PaymentSystemActivator()
    activator.run_activation()


if __name__ == "__main__":
    main()
