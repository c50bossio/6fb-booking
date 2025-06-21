#!/usr/bin/env python3
"""
Test Payment Split System
Tests the full flow: customer payment → automatic split → instant barber payout
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

# Test configuration
BARBER_ID = 1  # The barber who connected their Stripe account
APPOINTMENT_ID = 1  # You'll need a valid appointment ID
AMOUNT = 100.00  # $100 service


def test_payment_split():
    """Test the payment split flow"""

    print("🔄 Testing Payment Split System...")
    print(f"💰 Service Amount: ${AMOUNT}")
    print(f"💈 Barber gets 70%: ${AMOUNT * 0.7}")
    print(f"🏪 Shop gets 30%: ${AMOUNT * 0.3}")
    print("-" * 50)

    # 1. First, let's check the barber's connected account
    print("\n1️⃣ Checking barber's connected account...")

    # You'll need to get an auth token first
    # For testing, you might want to create a test endpoint that doesn't require auth

    # 2. Create a test payment
    print("\n2️⃣ Processing split payment...")

    payment_data = {
        "appointment_id": APPOINTMENT_ID,
        "amount": AMOUNT,
        "payment_method_id": "pm_card_visa",  # Test card
        "description": "Haircut service - automatic split payment test",
    }

    # Note: You'll need to add authentication headers
    response = requests.post(
        f"{BASE_URL}/api/v1/payment-splits/process-payment",
        json=payment_data,
        headers={
            "Content-Type": "application/json",
            # Add your auth token here
            # "Authorization": "Bearer YOUR_TOKEN"
        },
    )

    print(f"Response Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Payment Successful!")
        print(f"   Payment ID: {result.get('payment_id')}")
        print(f"   Total: ${result.get('total_amount')}")
        print(f"   Barber received: ${result.get('barber_received')}")
        print(f"   Shop commission: ${result.get('shop_commission')}")
        print(f"   Commission rate: {result.get('commission_rate')}")
    else:
        print(f"❌ Error: {response.text}")


def create_test_endpoint():
    """Create a test endpoint that doesn't require auth"""
    test_endpoint = '''
# Add this to your barber_payment_splits.py file temporarily for testing:

@router.post("/test-payment")
async def test_payment_split(
    db: Session = Depends(get_db)
):
    """Test endpoint - DO NOT USE IN PRODUCTION"""

    # Create a test appointment if needed
    appointment = db.query(Appointment).first()
    if not appointment:
        # Create test appointment
        appointment = Appointment(
            barber_id=1,
            client_id=1,
            service_id=1,
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow(),
            status="completed"
        )
        db.add(appointment)
        db.commit()

    # Process test payment
    split_service = PaymentSplitService()
    payment_model = db.query(BarberPaymentModel).filter(
        BarberPaymentModel.barber_id == 1
    ).first()

    if not payment_model or not payment_model.stripe_connect_account_id:
        return {"error": "Barber has no connected Stripe account"}

    # Calculate split
    split = split_service.calculate_split(
        total_amount=Decimal('100.00'),
        barber_payment_model={
            'payment_type': payment_model.payment_type.value,
            'service_commission_rate': payment_model.service_commission_rate
        }
    )

    # In test mode, we'll simulate the payment
    return {
        "test_mode": True,
        "total_amount": 100.00,
        "barber_amount": split['barber_amount'],
        "shop_amount": split['shop_amount'],
        "commission_rate": split['commission_rate'],
        "stripe_account": payment_model.stripe_connect_account_id,
        "message": "Test successful! In production, this would charge the customer and instantly pay the barber."
    }
'''
    print("\n📝 Test Endpoint Code:")
    print(test_endpoint)


def test_with_stripe_cli():
    """Instructions for testing with Stripe CLI"""
    print("\n🧪 Testing with Stripe CLI (Recommended):")
    print("-" * 50)
    print("1. Install Stripe CLI: brew install stripe/stripe-cli/stripe")
    print("2. Login: stripe login")
    print(
        "3. Listen for webhooks: stripe listen --forward-to localhost:8000/webhooks/stripe"
    )
    print("4. Trigger test payment:")
    print(
        "   stripe trigger payment_intent.succeeded --add payment_intent:metadata.barber_id=1"
    )
    print("\n5. Check the barber's Stripe dashboard:")
    print("   - Go to https://dashboard.stripe.com/test/connect/accounts")
    print("   - Find account: acct_1RcDzPAKiRITDSzw")
    print("   - Check the Payments and Payouts sections")


def create_simple_test_script():
    """Create a simple test script"""
    script = '''#!/usr/bin/env python3
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from decimal import Decimal
from config.database import SessionLocal
from models.barber_payment import BarberPaymentModel
from services.payment_split_service import PaymentSplitService

def test_split_calculation():
    """Test the split calculation"""
    db = SessionLocal()

    # Get the barber's payment model
    payment_model = db.query(BarberPaymentModel).filter(
        BarberPaymentModel.barber_id == 1
    ).first()

    if not payment_model:
        print("❌ No payment model found for barber 1")
        return

    print(f"✅ Found payment model:")
    print(f"   Stripe Account: {payment_model.stripe_connect_account_id}")
    print(f"   Commission Rate: {payment_model.service_commission_rate * 100}%")

    # Test split calculation
    service = PaymentSplitService()
    amounts = [50, 100, 150, 200]

    print(f"\\n💰 Payment Split Calculations:")
    print("-" * 50)
    for amount in amounts:
        split = service.calculate_split(
            total_amount=Decimal(str(amount)),
            barber_payment_model={
                'payment_type': payment_model.payment_type.value,
                'service_commission_rate': payment_model.service_commission_rate
            }
        )
        print(f"${amount} service → Barber: ${split['barber_amount']:.2f}, Shop: ${split['shop_amount']:.2f}")

    db.close()

if __name__ == "__main__":
    test_split_calculation()
'''

    with open("/Users/bossio/6fb-booking/backend/test_split_calc.py", "w") as f:
        f.write(script)

    print("\n✅ Created test_split_calc.py")


if __name__ == "__main__":
    print("🚀 Payment Split Testing Guide")
    print("=" * 50)

    # Show test options
    print("\nOption 1: Quick calculation test")
    print("Run: python test_split_calc.py")

    create_simple_test_script()

    print("\nOption 2: Create test endpoint")
    create_test_endpoint()

    print("\nOption 3: Test with Stripe CLI")
    test_with_stripe_cli()

    print("\n💡 Next Steps:")
    print("1. Run the calculation test to verify the split math")
    print("2. Add the test endpoint to your API for full flow testing")
    print("3. Use Stripe CLI for production-like testing")
