#!/usr/bin/env python3
"""
Test the payment split API endpoint
"""

import requests
import json

BASE_URL = "http://localhost:8000"


def test_payment_api():
    """Test the payment split via API"""

    print("🧪 Testing Payment Split API")
    print("=" * 50)

    # Add the test endpoint temporarily
    test_endpoint_code = '''
@router.get("/test-split-calculation")
async def test_split_calculation(
    db: Session = Depends(get_db)
):
    """Test endpoint to verify split calculations"""
    from decimal import Decimal

    # Get the payment model for barber 1
    payment_model = db.query(BarberPaymentModel).filter(
        BarberPaymentModel.barber_id == 1
    ).first()

    if not payment_model:
        return {"error": "No payment model found for barber 1"}

    # Test split calculations
    split_service = PaymentSplitService()
    test_amounts = [50, 100, 150, 200]
    results = []

    for amount in test_amounts:
        split = split_service.calculate_split(
            total_amount=Decimal(str(amount)),
            barber_payment_model={
                'payment_type': payment_model.payment_type.value,
                'service_commission_rate': payment_model.service_commission_rate
            }
        )

        results.append({
            "total": amount,
            "barber_gets": split['barber_amount'],
            "shop_gets": split['shop_amount'],
            "commission_rate": f"{split['commission_rate'] * 100}%"
        })

    return {
        "stripe_account": payment_model.stripe_connect_account_id,
        "payment_type": payment_model.payment_type.value,
        "commission_rate": f"{payment_model.service_commission_rate * 100}%",
        "calculations": results,
        "ready_for_payments": bool(payment_model.stripe_connect_account_id)
    }
'''

    print("\n📝 Add this test endpoint to barber_payment_splits.py:")
    print("-" * 50)
    print(test_endpoint_code)
    print("-" * 50)

    print("\n🔄 After adding the endpoint, the server will auto-reload")
    print("Then you can test it by visiting:")
    print("http://localhost:8000/api/v1/payment-splits/test-split-calculation")

    print("\n💳 To test actual payments:")
    print("1. Install Stripe CLI: brew install stripe/stripe-cli/stripe")
    print("2. Use the Stripe test cards:")
    print("   - Success: 4242 4242 4242 4242")
    print("   - Decline: 4000 0000 0000 0002")
    print("3. Check the connected account at:")
    print("   https://dashboard.stripe.com/test/connect/accounts/acct_1RcDzPAKiRITDSzw")


if __name__ == "__main__":
    test_payment_api()
