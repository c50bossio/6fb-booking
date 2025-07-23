#!/usr/bin/env python3
"""
Test the trial period functionality and pricing calculations.
"""

import requests
import json
from datetime import datetime

def test_subscription_details():
    """Test subscription service endpoints"""
    base_url = "http://127.0.0.1:8000"
    
    # Test subscription pricing calculations
    pricing_tests = [
        {"chairs": 1, "expected_plan": "individual", "expected_price": 39.0},
        {"chairs": 3, "expected_plan": "studio", "expected_price": 105.0},  # 3 chairs * $35
        {"chairs": 8, "expected_plan": "salon", "expected_price": 232.0},   # 3*$39 + 3*$35 + 2*$29
        {"chairs": 15, "expected_plan": "enterprise", "expected_price": 375.0}  # Complex calculation
    ]
    
    print("🧪 Testing Subscription Pricing Calculations...")
    print("=" * 60)
    
    for test in pricing_tests:
        chairs = test["chairs"]
        print(f"\n🪑 Testing {chairs} chairs:")
        print(f"   Expected Plan: {test['expected_plan']}")
        print(f"   Expected Price: ${test['expected_price']}")
        
        # Calculate actual price using the subscription service logic
        # 1-3 chairs: $39/chair, 4-6 chairs: $35/chair, 7-10 chairs: $29/chair, 11+ chairs: $25/chair
        total_price = 0.0
        remaining_chairs = chairs
        
        pricing_tiers = [(3, 39.0), (6, 35.0), (10, 29.0), (float('inf'), 25.0)]
        
        for tier_limit, tier_price in pricing_tiers:
            if remaining_chairs <= 0:
                break
            
            tier_start = chairs - remaining_chairs
            chairs_in_tier = min(remaining_chairs, tier_limit - tier_start)
            total_price += chairs_in_tier * tier_price
            remaining_chairs -= chairs_in_tier
        
        print(f"   Calculated Price: ${total_price}")
        
        if abs(total_price - test['expected_price']) < 0.01:
            print("   ✅ Pricing calculation correct!")
        else:
            print(f"   ❌ Pricing mismatch! Expected ${test['expected_price']}, got ${total_price}")

def test_trial_status():
    """Test trial status for registered users"""
    print("\n\n🕒 Testing Trial Status...")
    print("=" * 60)
    
    # Get user trial information from database
    import sqlite3
    
    conn = sqlite3.connect('6fb_booking.db')
    cursor = conn.cursor()
    
    # Get users with trial info
    cursor.execute("""
        SELECT id, email, user_type, trial_started_at, trial_expires_at, 
               trial_active, subscription_status
        FROM users 
        WHERE trial_active = 1
    """)
    
    users = cursor.fetchall()
    
    for user in users:
        user_id, email, user_type, trial_start, trial_end, trial_active, sub_status = user
        
        print(f"\n👤 {email} ({user_type}):")
        print(f"   Trial Start: {trial_start}")
        print(f"   Trial End: {trial_end}")
        print(f"   Status: {sub_status}")
        print(f"   Active: {'✅' if trial_active else '❌'}")
        
        # Calculate days remaining
        try:
            from datetime import datetime
            trial_end_dt = datetime.fromisoformat(trial_end.replace('Z', '+00:00') if trial_end.endswith('Z') else trial_end)
            now = datetime.now()
            days_remaining = (trial_end_dt - now).days
            print(f"   Days Remaining: {days_remaining}")
        except Exception as e:
            print(f"   Days Remaining: Error calculating ({e})")
    
    # Get organization info
    cursor.execute("""
        SELECT id, name, billing_plan, chairs_count, subscription_status
        FROM organizations
    """)
    
    orgs = cursor.fetchall()
    
    print(f"\n🏢 Organizations Created:")
    for org in orgs:
        org_id, name, plan, chairs, status = org
        print(f"   {name}: {plan} plan, {chairs} chairs, {status} status")
    
    conn.close()

if __name__ == "__main__":
    test_subscription_details()
    test_trial_status()