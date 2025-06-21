#!/usr/bin/env python3
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
    payment_model = (
        db.query(BarberPaymentModel).filter(BarberPaymentModel.barber_id == 1).first()
    )

    if not payment_model:
        print("❌ No payment model found for barber 1")
        return

    print(f"✅ Found payment model:")
    print(f"   Stripe Account: {payment_model.stripe_connect_account_id}")
    print(f"   Commission Rate: {payment_model.service_commission_rate * 100}%")

    # Test split calculation
    service = PaymentSplitService()
    amounts = [50, 100, 150, 200]

    print(f"\n💰 Payment Split Calculations:")
    print("-" * 50)
    for amount in amounts:
        split = service.calculate_split(
            total_amount=Decimal(str(amount)),
            barber_payment_model={
                "payment_type": payment_model.payment_type.value,
                "service_commission_rate": payment_model.service_commission_rate,
            },
        )
        print(
            f"${amount} service → Barber: ${split['barber_amount']:.2f}, Shop: ${split['shop_amount']:.2f}"
        )

    db.close()


if __name__ == "__main__":
    test_split_calculation()
