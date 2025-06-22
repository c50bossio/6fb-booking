#!/usr/bin/env python3
"""
Script to check Stripe connection status for Christopher Bossio
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.barber import Barber
from models.barber_payment import BarberPaymentModel
from config.database import DATABASE_URL

# Create database connection
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    # Find Christopher Bossio
    barber = db.query(Barber).filter(
        Barber.first_name == "Christopher",
        Barber.last_name == "Bossio"
    ).first()
    
    if not barber:
        print("❌ Christopher Bossio not found in the database")
        sys.exit(1)
    
    print(f"✅ Found barber: {barber.first_name} {barber.last_name} (ID: {barber.id})")
    print(f"   Email: {barber.email}")
    print(f"   Location ID: {barber.location_id}")
    print(f"   Created: {barber.created_at}")
    
    # Check for payment model
    payment_model = db.query(BarberPaymentModel).filter(
        BarberPaymentModel.barber_id == barber.id,
        BarberPaymentModel.active == True
    ).first()
    
    if not payment_model:
        print("\n❌ No active payment model found for this barber")
        print("   This means no payment configuration has been set up")
    else:
        print(f"\n✅ Found payment model (ID: {payment_model.id})")
        print(f"   Payment Type: {payment_model.payment_type.value if payment_model.payment_type else 'None'}")
        print(f"   Service Commission Rate: {payment_model.service_commission_rate * 100 if payment_model.service_commission_rate else 0}%")
        print(f"   Product Commission Rate: {payment_model.product_commission_rate * 100 if payment_model.product_commission_rate else 0}%")
        
        print("\n📱 Stripe Connect Status:")
        if payment_model.stripe_connect_account_id:
            print(f"   ✅ Connected: {payment_model.stripe_connect_account_id}")
            print(f"   Onboarding Completed: {'✅ Yes' if payment_model.stripe_onboarding_completed else '❌ No'}")
            print(f"   Payouts Enabled: {'✅ Yes' if payment_model.stripe_payouts_enabled else '❌ No'}")
        else:
            print("   ❌ Not connected to Stripe")
        
        print("\n💳 Other Payment Integrations:")
        if payment_model.square_merchant_id:
            print(f"   Square: Connected ({payment_model.square_merchant_id})")
        else:
            print("   Square: Not connected")
            
        if payment_model.rentredi_tenant_id:
            print(f"   RentRedi: Connected ({payment_model.rentredi_tenant_id})")
        else:
            print("   RentRedi: Not connected")
    
    # Check for all payment models (including inactive)
    all_payment_models = db.query(BarberPaymentModel).filter(
        BarberPaymentModel.barber_id == barber.id
    ).all()
    
    if len(all_payment_models) > 1:
        print(f"\n⚠️  Found {len(all_payment_models)} total payment models (including inactive)")
        for pm in all_payment_models:
            print(f"   - ID: {pm.id}, Active: {pm.active}, Stripe: {pm.stripe_connect_account_id or 'Not connected'}")

finally:
    db.close()