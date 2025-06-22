#!/usr/bin/env python3
"""
Verify Stripe connection for Christopher Bossio and test the connection
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.barber import Barber
from models.barber_payment import BarberPaymentModel
from config.database import DATABASE_URL
from services.stripe_connect_service import StripeConnectService
import stripe

# Create database connection
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# Check Stripe configuration
print("🔍 Checking Stripe configuration...")
stripe_key = os.getenv("STRIPE_SECRET_KEY")
if stripe_key:
    print(f"✅ Stripe secret key found (starts with: {stripe_key[:7]}...)")
else:
    print("❌ No Stripe secret key found in environment")

client_id = os.getenv("STRIPE_CONNECT_CLIENT_ID")
if client_id:
    print(f"✅ Stripe Connect client ID found: {client_id}")
else:
    print("❌ No Stripe Connect client ID found in environment")


def main():
    try:
        # Find Christopher Bossio
        barber = (
            db.query(Barber)
            .filter(Barber.first_name == "Christopher", Barber.last_name == "Bossio")
            .first()
        )

        if not barber:
            print("❌ Christopher Bossio not found in the database")
            return

        print(
            f"✅ Found barber: {barber.first_name} {barber.last_name} (ID: {barber.id})"
        )

        # Get payment model
        payment_model = (
            db.query(BarberPaymentModel)
            .filter(
                BarberPaymentModel.barber_id == barber.id,
                BarberPaymentModel.active == True,
            )
            .first()
        )

        if not payment_model:
            print("❌ No active payment model found")
            return

        if not payment_model.stripe_connect_account_id:
            print("❌ No Stripe account connected")
            return

        print(f"\n✅ Stripe Account ID: {payment_model.stripe_connect_account_id}")
        print(
            f"   Service Commission Rate: {payment_model.service_commission_rate * 100}%"
        )
        print(
            f"   Product Commission Rate: {payment_model.product_commission_rate * 100}%"
        )

        # Test Stripe connection
        print("\n🔍 Testing Stripe connection...")
        stripe_service = StripeConnectService()

        try:
            # Get account details
            account_info = stripe_service.get_account_details(
                payment_model.stripe_connect_account_id
            )

            print("\n✅ Stripe Account Details:")
            print(f"   Account ID: {account_info.get('id', 'unknown')}")
            print(f"   Type: {account_info.get('type', 'unknown')}")
            print(f"   Country: {account_info.get('country', 'unknown')}")
            print(f"   Email: {account_info.get('email', 'not set')}")
            print(
                f"   Details Submitted: {'✅ Yes' if account_info.get('details_submitted') else '❌ No'}"
            )
            print(
                f"   Payouts Enabled: {'✅ Yes' if account_info.get('payouts_enabled') else '❌ No'}"
            )
            print(
                f"   Charges Enabled: {'✅ Yes' if account_info.get('charges_enabled') else '❌ No'}"
            )

            # Check requirements
            requirements = account_info.get("requirements", {})
            currently_due = requirements.get("currently_due", [])
            if currently_due:
                print(f"\n⚠️  Outstanding requirements: {', '.join(currently_due)}")
            else:
                print("\n✅ No outstanding requirements")

            # Get balance
            try:
                balance = stripe_service.get_balance(
                    payment_model.stripe_connect_account_id
                )
                print(f"\n💰 Account Balance:")
                print(f"   Available: ${balance['available']}")
                print(f"   Pending: ${balance['pending']}")
            except Exception as e:
                print(f"\n⚠️  Could not retrieve balance: {str(e)}")

            # Get dashboard link
            try:
                dashboard_url = stripe_service.create_login_link(
                    payment_model.stripe_connect_account_id
                )
                print(f"\n🔗 Stripe Dashboard URL:")
                print(f"   {dashboard_url}")
                print(f"\n   (This link expires in 15 minutes)")
            except Exception as e:
                print(f"\n⚠️  Could not create dashboard link: {str(e)}")

            print("\n✅ Stripe connection is working properly!")

        except Exception as e:
            print(f"\n❌ Error testing Stripe connection: {str(e)}")
            print(f"   Error type: {type(e).__name__}")
            if hasattr(e, "user_message"):
                print(f"   User message: {e.user_message}")
            if hasattr(e, "code"):
                print(f"   Error code: {e.code}")
            print(
                "   This could mean the account was disconnected or there's an API issue"
            )

            # Try a simpler API call to test basic connectivity
            print("\n🔍 Testing basic Stripe API connectivity...")
            try:
                stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
                # Just try to list accounts
                accounts = stripe.Account.list(limit=1)
                print("✅ Basic Stripe API connection is working")
            except Exception as basic_error:
                print(f"❌ Basic Stripe API test failed: {str(basic_error)}")

    finally:
        db.close()


if __name__ == "__main__":
    main()
